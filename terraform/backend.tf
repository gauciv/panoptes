# Static IP
resource "aws_lightsail_static_ip" "backend_ip" {
  name = "panoptes-backend-static-ip"
}

# Lightsail Instance
resource "aws_lightsail_instance" "backend_server" {
  name              = "panoptes-backend"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = "micro_2_0"

  # Auto-install Docker
  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo apt-get install -y ca-certificates curl gnupg
              sudo install -m 0755 -d /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
              sudo chmod a+r /etc/apt/keyrings/docker.gpg
              echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
              sudo apt-get update
              sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
              sudo usermod -aG docker ubuntu
              EOF
}

# Attach IP
resource "aws_lightsail_static_ip_attachment" "backend_attach" {
  static_ip_name = aws_lightsail_static_ip.backend_ip.name
  instance_name  = aws_lightsail_instance.backend_server.name
}

# Firewall Rules
resource "aws_lightsail_instance_public_ports" "firewall" {
  instance_name = aws_lightsail_instance.backend_server.name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
  }
  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }
  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }
  port_info {
    protocol  = "tcp"
    from_port = 5033
    to_port   = 5033
  }
}