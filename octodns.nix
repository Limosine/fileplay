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
