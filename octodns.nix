{ ipPlaceholder ? "PUBLIC_IP" }:

let
  record = {
    octodns.cloudflare.auto-ttl = true;
  };

  proxied = {
    octodns.cloudflare.proxied = true;
  };

  a_record = record // {
    type = "A";
    value = ipPlaceholder;
  };

  mx_value = route: preference: {
    exchange = "route${toString route}.mx.cloudflare.net.";
    inherit preference;
  };

  mx_record = record // {
    type = "MX";
    value = [
      (mx_value 1 58)
      (mx_value 2 46)
      (mx_value 3 64)
    ];
  };

  cname_record = value: proxied // {
    type = "CNAME";
    inherit value;
  };

  txt_record = value: record // {
    type = "TXT";
    inherit value;
  };
in {
  domain."fileplay.me" = {
    "" = [
      mx_record
      (txt_record "v=spf1 include:_spf.mx.cloudflare.net ~all")
    ];

    "_dmarc" = [
      (txt_record "v=DMARC1\\;  p=none\\; rua=mailto:63ec8eaa9db1457d8ddc29922bfbe366@dmarc-reports.cloudflare.net")
    ];

    "cf2024-1._domainkey" = [
      (txt_record "v=DKIM1\\; h=sha256\\; k=rsa\\; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiweykoi+o48IOGuP7GR3X0MOExCUDY/BCRHoWBnh3rChl7WhdyCxW3jgq1daEjPPqoi7sJvdg5hEQVsgVRQP4DcnQDVjGMbASQtrY4WmB1VebF+RPJB2ECPsEDTpeiI5ZyUAwJaVX7r6bznU67g7LvFq35yIo4sdlmtZGV+i0H4cpYH9+3JJ78km4KXwaf9xUJCWF6nxeD+qG6Fyruw1Qlbds2r85U9dkNDVAS3gioCvELryh1TxKGiVTkg4wqHTyHfWsp7KD3WQHYJn0RyfJJu6YEmL77zonn7p2SRMvTMP3ZEXibnC9gz3nnhR6wcYL8Q7zXypKTMD58bTixDSJwIDAQAB")
    ];

    "api" = [ a_record ];
    "api-dev" = [ a_record ];

    "app" = [ 
      (cname_record "fileplay.pages.dev.")
    ];

    "dev" = [ 
      (cname_record "dev.fileplay.pages.dev.")
    ];

    "www" = [
      (cname_record "fileplay.me.")
    ];
  };
}
