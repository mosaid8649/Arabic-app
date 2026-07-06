resource "aws_s3_bucket" "arabic_app_s3" {
bucket = "arabic-app-s3"
tags = {
    Name = "arabic_app_s3"
}
}