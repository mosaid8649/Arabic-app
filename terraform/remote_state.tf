resource "aws_s3_bucket" "arabic-app-state" {
    bucket = "arabic-app-state"
}
resource "aws_dynamodb_table" "dynamo-table" {
    name = "arabic-app-table"
    billing_mode = "PAY_PER_REQUEST"
      hash_key = "LockID"
    attribute {
   name = "LockID"
   type = "S"
}

}