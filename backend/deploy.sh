#!/usr/bin/env bash
# Deploy the Trip Planner backend with AWS SAM.
# Prerequisites: aws CLI configured, sam CLI installed.
# Usage: bash backend/deploy.sh [region]
set -euo pipefail

STACK_NAME="trip-planner"
REGION="${1:-${AWS_DEFAULT_REGION:-us-east-1}}"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="trip-planner-sam-${ACCOUNT}-${REGION}"

echo ">>> Region:  $REGION"
echo ">>> Account: $ACCOUNT"
echo ">>> Bucket:  $BUCKET"
echo ""

# Create S3 staging bucket if it doesn't exist
if ! aws s3 ls "s3://${BUCKET}" --region "$REGION" &>/dev/null; then
  echo ">>> Creating S3 staging bucket..."
  if [ "$REGION" = "us-east-1" ]; then
    aws s3 mb "s3://${BUCKET}" --region "$REGION"
  else
    aws s3 mb "s3://${BUCKET}" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
fi

echo ">>> Building..."
sam build \
  --template-file "$(dirname "$0")/template.yaml" \
  --region "$REGION"

echo ">>> Deploying..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --s3-bucket "$BUCKET" \
  --capabilities CAPABILITY_IAM \
  --region "$REGION" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo ""
echo "=========================================="
echo "  Stack outputs — copy into js/aws-config.js"
echo "=========================================="
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table
