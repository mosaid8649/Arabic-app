resource "aws_ecs_cluster" "ecs-cluster-app" {
    name = "ecs-arabic-app"
    tags = {
        Name = "ecs-cluster-app"
    }
}

resource "aws_ecs_task_definition" "arabic_app_task" {
    family                   = "arabic-app-task"
    network_mode             = "awsvpc"
    requires_compatibilities = ["FARGATE"]
    cpu                      = "256"
    memory                   = "512"
    execution_role_arn       = aws_iam_role.ecs_execution_role.arn
    task_role_arn            = aws_iam_role.ecs_task_role.arn

    container_definitions = jsonencode([
        {
            name  = "arabic-app"
            image = "357980556753.dkr.ecr.eu-west-2.amazonaws.com/mohamed/arabic-app:latest"
            portMappings = [
                {
                    containerPort = 5000
                    hostPort      = 5000
                }
            ]
        }
    ])
}

resource "aws_ecs_service" "ecs_servi" {
    name            = "arabic-app-service"
    cluster         = aws_ecs_cluster.ecs-cluster-app.id
    task_definition = aws_ecs_task_definition.arabic_app_task.arn
    desired_count   = 1
    launch_type     = "FARGATE"

    network_configuration {
        subnets          = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]
        security_groups  = [aws_security_group.ecs_rules.id]
        assign_public_ip = true
    }

    load_balancer {
        target_group_arn = aws_lb_target_group.arabic_app_tg.arn
        container_name   = "arabic-app"
        container_port   = 5000
    }

    depends_on = [aws_lb_listener.arabic_app_listener_https]
}