#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ImagesStack } from "../lib/imagesStack.js";

const app = new cdk.App();

new ImagesStack(app, "images-stack");
