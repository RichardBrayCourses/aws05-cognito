import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
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

    const integration = new LambdaIntegration(apiFunction, { proxy: true });

    api.root.addMethod("ANY", integration);
    api.root.addProxy({
      anyMethod: true,
      defaultIntegration: integration,
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
