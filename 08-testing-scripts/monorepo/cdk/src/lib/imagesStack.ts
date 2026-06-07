import { CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export class ImagesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const imagesBucket = new Bucket(this, "ImagesBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    const distribution = new Distribution(this, "ImagesDistribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(imagesBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new StringParameter(this, "CloudfrontImagesBucketNameParameter", {
      parameterName: "/images/bucket-name",
      stringValue: imagesBucket.bucketName,
    });

    new StringParameter(this, "CloudfrontImagesUrlParameter", {
      parameterName: "/images/distribution-url",
      stringValue: `https://${distribution.distributionDomainName}`,
    });

    new CfnOutput(this, "CloudfrontImagesBucketName", {
      value: imagesBucket.bucketName,
    });

    new CfnOutput(this, "CloudfrontImagesDistributionUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
