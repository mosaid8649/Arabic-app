resource "aws_eks_cluster" "eks_cluster" {
    name = "arabic-app-cluster"
    role_arn = aws_iam_role.eks_cluster_role.arn
    vpc_config {
        subnet_ids =[
         aws_subnet.public_subnet_1.id,
         aws_subnet.public_subnet_2.id
        ]
    }
    depends_on = [
  aws_iam_role_policy_attachment.eks_cluster_policy
    ]
    }
resource "aws_eks_node_group" "arabic_app" {
  cluster_name    = aws_eks_cluster.eks_cluster.name
  node_group_name = "arabic-app-nodes"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids =[
        aws_subnet.public_subnet_1.id,
        aws_subnet.public_subnet_2.id
        ]
    

  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 1
  }

  instance_types = ["t3.small"] 

  depends_on = [
  aws_iam_role_policy_attachment.eks_worker_node_policy,
  aws_iam_role_policy_attachment.eks_cni_policy,
  aws_iam_role_policy_attachment.eks_ecr_policy
]
}