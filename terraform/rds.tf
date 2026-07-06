resource "aws_db_instance" "arabicapp_rds" {
    identifier = "arabicapp-db"
    engine = "postgres"
    engine_version = "13.21"
    instance_class = "db.t3.micro"
    allocated_storage = 20
    db_name = "arabicapp"
    username = "arabicapp_admin"
    password = var.db_password
    vpc_security_group_ids = [aws_security_group.RDS_rules.id]
    skip_final_snapshot = true
      db_subnet_group_name = aws_db_subnet_group.rds_subnet_group.name
}

resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "arabicapp-rds-subnet-group"
  subnet_ids = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  tags = {
    Name = "arabicapp-rds-subnet-group"
  }
}