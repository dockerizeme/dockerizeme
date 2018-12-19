# -*- mode: ruby -*-
# vi: set ft=ruby :


Vagrant.configure("2") do |config|

  # Define DockerizeMe machine
  config.vm.define :dockerizeeme do |machine|

    # Use Ubuntu Xenial
    machine.vm.box = 'ubuntu/xenial64'
    machine.vm.box_version = '20181217.0.0'

    # Set up private network for local access
    machine.vm.network 'private_network', ip: '192.168.33.10'

    # VirtualBox Config
    machine.vm.provider :virtualbox do |virtualbox|

      # Add memory (default is 1024)
      virtualbox.memory = 2048

    end

    # Provision with Ansible
    machine.vm.provision :ansible_local do |ansible|

      ansible.playbook = 'vagrant.yml'
      ansible.compatibility_mode = '2.0'

    end

  end

end
