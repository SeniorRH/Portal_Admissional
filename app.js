const form = document.querySelector("#admissionForm");
const sections = [...document.querySelectorAll(".form-section")];
const nextBtn = document.querySelector("#nextBtn");
const backBtn = document.querySelector("#backBtn");
const submitBtn = document.querySelector("#submitBtn");
const progressBar = document.querySelector("#progressBar");
const stepCaption = document.querySelector("#stepCaption");
const progressPercent = document.querySelector("#progressPercent");
const statusMessage = document.querySelector("#statusMessage");
let currentStep = 1;

const documents = [
  ["ctps", "Carteira de Trabalho Digital", true],
  ["rg", "Carteira de Identidade (RG)", true],
  ["titulo", "Título de Eleitor", false],
  ["cpfDoc", "Documento CPF", true],
  ["reservista", "Certificado de Reservista", false],
  ["certidao", "Certidão de nascimento ou casamento", true],
  ["filhos", "Certidões de nascimento dos filhos menores de 18 anos", false],
  ["enderecoDoc", "Comprovante de endereço", true],
  ["foto", "Foto 3x4 atual", true]
];

const uploadList = document.querySelector("#uploadList");
documents.forEach(([key, title, required]) => {
  const label = document.createElement("label");
  label.className = "upload-item";
  label.innerHTML = `<span><strong>${title}${required ? " *" : ""}</strong><small>${required ? "Documento solicitado" : "Se aplicável"}</small></span>
    <input type="file" name="${key}" accept=".pdf,.jpg,.jpeg,.png" ${required ? "required" : ""} aria-label="${title}">`;
  uploadList.appendChild(label);
});

function setStep(step) {
  currentStep = step;
  sections.forEach(section => section.classList.toggle("active", Number(section.dataset.step) === step));
  const percent = Math.round(step / sections.length * 100);
  progressBar.style.width = `${percent}%`;
  stepCaption.textContent = `Etapa ${step} de ${sections.length}`;
  progressPercent.textContent = `${percent}%`;
  backBtn.hidden = step === 1;
  nextBtn.hidden = step === sections.length;
  submitBtn.hidden = step !== sections.length;
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
  window.scrollTo({top: 0, behavior: "smooth"});
}
function validateCurrentStep() {
  const fields = [...sections[currentStep - 1].querySelectorAll("input,select")];
  for (const field of fields) {
    if (field.type === "file" && field.files.length) {
      const file = field.files[0];
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      const maxBytes = (window.APP_CONFIG?.MAX_FILE_MB || 8) * 1024 * 1024;
      if (!allowed.includes(file.type)) {
        field.setCustomValidity("Use PDF, JPG ou PNG.");
        field.reportValidity(); field.setCustomValidity(""); return false;
      }
      if (file.size > maxBytes) {
        field.setCustomValidity(`O arquivo deve ter no máximo ${window.APP_CONFIG?.MAX_FILE_MB || 8} MB.`);
        field.reportValidity(); field.setCustomValidity(""); return false;
      }
    }
    if (!field.checkValidity()) { field.reportValidity(); field.focus(); return false; }
  }
  return true;
}
nextBtn.addEventListener("click", () => { if (validateCurrentStep()) setStep(Math.min(currentStep + 1, sections.length)); });
backBtn.addEventListener("click", () => setStep(Math.max(currentStep - 1, 1)));

document.querySelector("#pcd").addEventListener("change", event => {
  document.querySelector("#deficienciaWrap").classList.toggle("hidden", event.target.value !== "Sim");
});
document.querySelector("#cpf").addEventListener("input", event => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
  event.target.value = v;
});
document.querySelector("#cep").addEventListener("input", event => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 8);
  if (v.length > 5) v = v.replace(/(\d{5})(\d{1,3})/, "$1-$2");
  event.target.value = v;
});
document.querySelector("#cep").addEventListener("blur", async () => {
  const cep = document.querySelector("#cep").value.replace(/\D/g, "");
  const msg = document.querySelector("#cepMessage");
  if (cep.length !== 8) return;
  msg.textContent = "Consultando CEP…";
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("Falha na consulta");
    const data = await response.json();
    if (data.erro) throw new Error("CEP não encontrado. Confira e preencha o endereço manualmente.");
    document.querySelector("#endereco").value = data.logradouro || "";
    document.querySelector("#bairro").value = data.bairro || "";
    document.querySelector("#cidade").value = data.localidade || "";
    document.querySelector("#estado").value = data.uf || "";
    msg.textContent = "Endereço preenchido quando disponível. Confira os dados antes de continuar.";
  } catch (error) {
    msg.textContent = error.message || "Não foi possível consultar o CEP. Preencha o endereço manualmente.";
  }
});
document.querySelector("#celular").addEventListener("input", event => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
  else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{1,4})/, "($1) $2-$3");
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, "($1) $2");
  event.target.value = v;
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!validateCurrentStep()) return;
  const endpoint = window.APP_CONFIG?.APPS_SCRIPT_URL;
  if (!endpoint || endpoint.includes("COLE_A_URL")) {
    showStatus("Configure a URL do Apps Script em frontend/config.js antes de enviar.", true);
    return;
  }
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.textContent = "Preparando envio…";
  try {
    const data = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (value instanceof File) continue;
      data[key] = value;
    }
    data.documentos = [];
    for (const [key, title] of documents) {
      const input = form.elements[key];
      const file = input?.files?.[0];
      if (!file) continue;
      data.documentos.push({
        chave: key, nome: title, nomeArquivo: file.name, mimeType: file.type,
        tamanho: file.size, base64: await fileToBase64(file)
      });
    }
    data.acao = "enviarCadastro";
    data.origem = window.location.href;
    submitBtn.textContent = "Enviando cadastro…";
    // O Apps Script deve implementar doPost e validar todo o conteúdo recebido.
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify(data),
      redirect: "follow"
    });
    if (!response.ok) throw new Error("O servidor retornou um erro HTTP.");
    const result = await response.json();
    if (!result.ok) throw new Error(result.mensagem || "Não foi possível concluir o cadastro.");
    form.reset();
    showStatus("Cadastro enviado com sucesso. Você pode fechar esta página.", false);
    statusMessage.classList.add("success");
  } catch (error) {
    showStatus("Não foi possível confirmar o envio. " + (error.message || "Verifique a implantação do Apps Script e tente novamente."), true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});
function showStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message " + (isError ? "error" : "success");
  statusMessage.scrollIntoView({behavior:"smooth", block:"center"});
}
setStep(1);
