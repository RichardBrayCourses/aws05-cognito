#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/apiStack.js";

const app = new cdk.App();

new ApiStack(app, "api-stack");
