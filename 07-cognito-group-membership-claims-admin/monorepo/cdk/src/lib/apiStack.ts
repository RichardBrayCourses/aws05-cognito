import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { join } from "node:path";

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const imagesBucketName = StringParameter.valueForStringParameter(
      this,
      "/images/bucket-name",
    );
    const imagesCloudfrontUrl = StringParameter.valueForStringParameter(
      this,
      "/images/distribution-url",
    );
    const userPoolId = StringParameter.valueForStringParameter(
      this,
      "/cognito/user-pool-id",
    );

    const photosBucket = Bucket.fromBucketName(
      this,
      "ImportedImagesBucket",
      imagesBucketName,
    );

    const apiFunction = new NodejsFunction(this, "ApiFunction", {
      entry: join(
        __dirname,
        "..",
        "..",
        "..",
        "services",
        "api",
        "src",
        "index.ts",
      ),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(10),
      environment: {
        IMAGES_BUCKET_NAME: imagesBucketName,
        IMAGES_CLOUDFRONT_URL: imagesCloudfrontUrl,
      },
    });

    photosBucket.grantRead(apiFunction);
    photosBucket.grantPut(apiFunction);
    photosBucket.grantDelete(apiFunction);

    const api = new RestApi(this, "ApiGateway", {
      restApiName: "api-service",
      deployOptions: {
        stageName: "api",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const apiIntegration = new LambdaIntegration(apiFunction, {
      proxy: true,
    });
    const userPool = UserPool.fromUserPoolId(this, "ImportedUserPool", userPoolId);
    const authorizer = new CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuthorizer",
      {
        cognitoUserPools: [userPool],
        identitySource: "method.request.header.Authorization",
      },
    );

    const publicResource = api.root.addResource("public");
    publicResource.addProxy({
      anyMethod: true,
      defaultIntegration: apiIntegration,
      defaultMethodOptions: {
        authorizationType: AuthorizationType.NONE,
      },
    });

    const authResource = api.root.addResource("auth");
    authResource.addProxy({
      anyMethod: true,
      defaultIntegration: apiIntegration,
      defaultMethodOptions: {
        authorizationType: AuthorizationType.COGNITO,
        authorizer,
      },
    });

    api.addGatewayResponse("UnauthorizedGatewayResponse", {
      type: ResponseType.UNAUTHORIZED,
      statusCode: "401",
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
        "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    api.addGatewayResponse("AccessDeniedGatewayResponse", {
      type: ResponseType.ACCESS_DENIED,
      statusCode: "403",
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
        "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    new StringParameter(this, "ApiBaseUrlParameter", {
      parameterName: "/services/api/base-url",
      stringValue: api.url,
    });

    new CfnOutput(this, "ApiGatewayUrl", {
      value: api.url,
    });
  }
}
