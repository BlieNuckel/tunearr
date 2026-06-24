{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.tunearr;
in
{
  options.services.tunearr = {
    enable = lib.mkEnableOption "tunearr music request server";

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.tunearr;
      defaultText = lib.literalExpression "pkgs.tunearr";
      description = "The tunearr package to run.";
    };

    dataDir = lib.mkOption {
      type = lib.types.str;
      default = "/var/lib/tunearr";
      description = ''
        Directory holding all persistent state: the SQLite database, the
        runtime config JSON, and rotated logs. Mapped to APP_CONFIG_DIR.
      '';
    };

    user = lib.mkOption {
      type = lib.types.str;
      default = "tunearr";
      description = ''
        User the service runs as. If left at the default, the user is created
        automatically; set it to an existing user (e.g. a shared "media" user)
        to manage it yourself.
      '';
    };

    group = lib.mkOption {
      type = lib.types.str;
      default = "tunearr";
      description = ''
        Group the service runs as. If left at the default, the group is created
        automatically; set it to an existing group (e.g. "media") to manage it
        yourself.
      '';
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 3001;
      description = "TCP port the server listens on.";
    };

    openFirewall = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether to open {option}`port` in the firewall.";
    };

    environment = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = { };
      example = {
        LOG_LEVEL = "debug";
      };
      description = "Extra environment variables passed to the service.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.tmpfiles.rules = [
      "d '${cfg.dataDir}' 0700 ${cfg.user} ${cfg.group} - -"
    ];

    systemd.services.tunearr = {
      description = "tunearr music request server";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];

      environment = {
        NODE_ENV = "production";
        PORT = toString cfg.port;
        APP_CONFIG_DIR = cfg.dataDir;
      }
      // cfg.environment;

      serviceConfig = {
        Type = "simple";
        ExecStart = lib.getExe cfg.package;
        User = cfg.user;
        Group = cfg.group;
        WorkingDirectory = cfg.dataDir;
        Restart = "on-failure";
        RestartSec = 5;

        # Hardening
        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        ReadWritePaths = [ cfg.dataDir ];
      };
    };

    users.users = lib.mkIf (cfg.user == "tunearr") {
      tunearr = {
        group = cfg.group;
        home = cfg.dataDir;
        isSystemUser = true;
      };
    };

    users.groups = lib.mkIf (cfg.group == "tunearr") {
      tunearr = { };
    };

    networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ cfg.port ];
  };
}
