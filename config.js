// Configure com a URL da implantação do Google Apps Script.
// Não coloque senhas, tokens privados ou credenciais neste arquivo público.
window.APP_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxYfZubgzKYQw-qnovCdkRX2mauWy7nch6kS1x1Fa06dYxvfdxk2W4bjch3fXFUKrCbqg/exec",
  MAX_FILE_MB: 5,
  DEFAULT_COMPANY: "senior",
  FALLBACK_LOGO_URL: "https://datasenior.com.br/wp-content/uploads/2024/03/lgnormal.svg",
  COMPANIES: {
    senior: {
      name: "Senior",
      logo: "https://datasenior.com.br/wp-content/uploads/2024/03/lgnormal.svg",
      website: "https://datasenior.com.br/",
      stylesheet: "themes/senior.css?v=0.9.8"
    },
    seniorcon: {
      name: "Senior Con",
      logo: "https://datasenior.com.br/wp-content/uploads/2024/03/lgnormal.svg",
      website: "https://datasenior.com.br/",
      stylesheet: "themes/seniorcon.css?v=0.9.3"
    },
    digital: {
      name: "Digital",
      logo: "https://datasenior.com.br/wp-content/uploads/2024/03/logo-digital.jpg",
      website: "https://datasenior.com.br/",
      stylesheet: "themes/digital.css?v=0.9.3"
    },
    datasenior: {
      name: "Datasenior",
      logo: "logodatasenior.png",
      website: "https://datasenior.com.br/",
      stylesheet: "themes/datasenior.css?v=0.9.9"
    },
    works: {
      name: "Works",
      logo: "https://datasenior.com.br/wp-content/uploads/2024/03/logo-works.jpg",
      website: "https://datasenior.com.br/",
      stylesheet: "themes/works.css?v=0.9.3"
    }
  }
};
