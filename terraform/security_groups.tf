resource "aws_security_group" "app_security_grp" {
    name = "app-security-grp"
    vpc_id = aws_vpc.main_vpc.id
    ingress {
        from_port = "80"
        to_port = "80"
        cidr_blocks = ["0.0.0.0/0"] 
        protocol = "tcp" 
        
    }
  
    ingress {
        from_port = "443"
        to_port = "443"
        cidr_blocks = ["0.0.0.0/0"]
        protocol = "tcp" 
         
    }
    
    
    egress {
        from_port = 0
        to_port = 0
        cidr_blocks = ["0.0.0.0/0"] 
      protocol = "-1"
       
    }
    tags = {
            Name = "app-security-grp"
        }
} 
resource "aws_security_group" "ecs_rules" {
    name = "aws ecs resource"
    vpc_id = aws_vpc.main_vpc.id
    ingress {
        from_port = "5000"
        to_port = "5000"
        protocol = "tcp"
        security_groups = [aws_security_group.app_security_grp.id]
    }
    egress {
        from_port = "0"
        to_port = "0"
        cidr_blocks = ["0.0.0.0/0"]
        protocol = "-1" 

    }
    tags = {
        Name = "ecs rules"
    }
}
resource "aws_security_group" "RDS_rules" {
    name = "aws rds resource"
    vpc_id = aws_vpc.main_vpc.id
    ingress {
        from_port = "5432"
        to_port = "5432"
        protocol = "tcp"
        security_groups = [aws_security_group.ecs_rules.id]
    }
    egress {
        from_port = "0"
        to_port = "0"
        cidr_blocks = ["0.0.0.0/0"]
        protocol = "-1" 

    }
    tags = {
        Name = "RDS rules"
    }
}