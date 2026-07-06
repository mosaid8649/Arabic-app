resource "aws_lb_target_group" "arabic_app_tg" {
    name = "arabic-app-tg"
    port = "5000"
    protocol = "HTTP"
    vpc_id = aws_vpc.main_vpc.id
    target_type = "ip"
    health_check  {
        path = "/api/health"
    }
}

resource "aws_lb" "arabic_app_lb" {
    name = "arabic-app-lb"
    internal = false
    load_balancer_type = "application"
    security_groups = [aws_security_group.app_security_grp.id]
    subnets = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]
}

resource "aws_lb_listener" "arabic_app_listener" {
    load_balancer_arn = aws_lb.arabic_app_lb.arn
    port = "80"
    protocol = "HTTP"
    default_action {

    type = "redirect"
    redirect {
        port = "443"
        protocol = "HTTPS"
        status_code = "HTTP_301"
    }
   
}
}
resource "aws_lb_listener" "arabic_app_listener_https" {
    load_balancer_arn = aws_lb.arabic_app_lb.arn
    port              = "443"
    protocol          = "HTTPS"
    certificate_arn   = aws_acm_certificate_validation.acm_cert_validation.certificate_arn

    default_action {
        type             = "forward"
        target_group_arn = aws_lb_target_group.arabic_app_tg.arn
    }
}