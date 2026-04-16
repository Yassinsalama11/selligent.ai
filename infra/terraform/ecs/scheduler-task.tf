resource "aws_ecs_task_definition" "chatorai_scheduler" {
  family                   = "chatorai-scheduler"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "scheduler"
      image     = var.scheduler_image
      essential = true
    }
  ])
}
