resource "aws_vpc" "main_vpc" {
    cidr_block = "10.0.0.0/16"
    tags = { 
        Name = "arabic-app-vpc"
    }
}

resource "aws_subnet" "public_subnet_1" {
    vpc_id = aws_vpc.main_vpc.id
    cidr_block = "10.0.1.0/24"
    availability_zone = "eu-west-2c"
    tags = {
        Name = "public subnet 1"
    }
}


resource "aws_subnet" "private_subnet" {
vpc_id = aws_vpc.main_vpc.id
cidr_block = "10.0.2.0/24" 
availability_zone = "eu-west-2c"
tags = {
    Name = "Private subnet"
}
}

resource "aws_subnet" "public_subnet_2" { 
    vpc_id = aws_vpc.main_vpc.id
    cidr_block = "10.0.3.0/24"
    availability_zone = "eu-west-2b"
tags = {
    Name = "public subnet 2"
}
}

resource "aws_internet_gateway" "app_internet_gateway" {
     vpc_id = aws_vpc.main_vpc.id
     tags = {
        Name = "internet gateway"
     }
}

resource "aws_route_table" "route_table" {
    vpc_id = aws_vpc.main_vpc.id
    route {  
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.app_internet_gateway.id
    }

    tags = {
        Name = "public route table"

    }
}
resource "aws_route_table_association" "route_table_asc1" {
    subnet_id = aws_subnet.public_subnet_1.id
    route_table_id = aws_route_table.route_table.id
}

resource "aws_route_table_association" "route_table_asc2" {
    subnet_id = aws_subnet.public_subnet_2.id 
    route_table_id = aws_route_table.route_table.id
}
