resource "aws_ecr_repository" "ecr_images" {
name = "ecr_images"
tags = {
    Name = "ecr_images"
}
}