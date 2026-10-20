const form = document.querySelector("#admissionForm");
const sections = [...document.querySelectorAll(".form-section")];
const nextBtn = document.querySelector("#nextBtn");
const backBtn = document.querySelector("#backBtn");
const submitBtn = document.querySelector("#submitBtn");
const progressBar = document.querySelector("#progressBar");
const stepCaption = document.querySelector("#stepCaption");
const progressPercent = document.querySelector("#progressPercent");
const statusMessage = document.querySelector("#statusMessage");
const uploadList = document.querySelector("#uploadList");
const missingSummary = document.querySelector("#missingSummary");
const overallProgress = document.querySelector("#overallProgress");
const overallPercent = document.querySelector("#overallPercent");
const overallMessage = document.querySelector("#overallMessage");
let currentStep = 1;
let sending = false;
let cadastroId = null;
let sessionPromise = null;
const uploadedKeys = new Set();
const uploadingKeys = new Set();

// CNH substitui conjuntamente RG e documento CPF. Se não houver CNH, ambos são exigidos.
const documents = [
  {key:"ctps", title:"Carteira de Trabalho Digital", required:true, crucial:true, help:"Indispensável"},
  {key:"cnh", title:"CNH (substitui RG e CPF)", required:false, crucial:true, help:"Alternativa: envie RG e CPF abaixo"},
  {key:"rg", title:"Carteira de Identidade (RG)", required:false, crucial:true, help:"Obrigatório se não enviar CNH"},
  {key:"cpfDoc", title:"Documento CPF", required:false, crucial:true, help:"Obrigatório se não enviar CNH"},
  {key:"titulo", title:"Título de Eleitor", required:false, crucial:false, help:"Opcional / conforme solicitação do RH"},
  {key:"reservista", title:"Certificado de Reservista", required:false, crucial:false, help:"Quando aplicável"},
  {key:"certidao", title:"Certidão de nascimento ou casamento", required:true, crucial:true, help:"Indispensável"},
  {key:"filhos", title:"Certidões de nascimento dos filhos menores de 18 anos", required:false, crucial:false, help:"Se houver filhos menores de 18 anos"},
  {key:"enderecoDoc", title:"Comprovante de endereço (luz ou telefone)", required:true, crucial:true, help:"Indispensável"},
  {key:"foto", title:"Foto 3x4 atual", required:true, crucial:true, help:"Indispensável"}
];

function renderDocuments() {
  documents.forEach(doc => {
    const item = document.createElement("div");
    item.className = "upload-item";
    item.dataset.doc = doc.key;
    item.innerHTML = `<span class="upload-copy"><strong>${doc.title}</strong><small>${doc.help}</small><span class="file-status" id="status-${doc.key}">Nenhum arquivo selecionado</span><span class="file-progress"><span id="bar-${doc.key}"></span></span></span>
      <span class="upload-control"><input type="file" name="${doc.key}" accept=".pdf,.jpg,.jpeg,.png" aria-label="${doc.title}"><span class="pill ${doc.crucial ? "crucial" : "optional"}">${doc.crucial ? "Crucial" : "Opcional"}</span></span>`;
    uploadList.appendChild(item);
    item.querySelector("input").addEventListener("change", event => {
      const file = event.target.files[0];
      const status = document.querySelector(`#status-${doc.key}`);
      const bar = document.querySelector(`#bar-${doc.key}`);
      item.classList.remove("file-error", "file-ready");
      if (!file) { status.textContent = "Nenhum arquivo selecionado"; bar.style.width = "0%"; return; }
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      const maxBytes = (window.APP_CONFIG?.MAX_FILE_MB || 8) * 1024 * 1024;
      if (!allowed.includes(file.type)) {
        event.target.value = ""; status.textContent = "Formato inválido. Use PDF, JPG ou PNG."; item.classList.add("file-error"); bar.style.width = "0%"; return;
      }
      if (file.size > maxBytes) {
        event.target.value = ""; status.textContent = `Arquivo maior que ${window.APP_CONFIG?.MAX_FILE_MB || 8} MB.`; item.classList.add("file-error"); bar.style.width = "0%"; return;
      }
      status.textContent = `${file.name} · ${formatBytes(file.size)} · iniciando upload…`;
      bar.style.width = "0%";
      item.classList.add("file-ready");
      uploadSelectedDocument(doc, file, event.target).catch(error => {
        status.textContent = "Falha no envio: " + (error.message || "erro desconhecido");
        item.classList.add("file-error");
        uploadingKeys.delete(doc.key);
        updateMissingSummary();
        updateSubmitVisibility();
        showStatus(`Não foi possível enviar ${doc.title}: ${error.message || "verifique a configuração do Drive"}. Os documentos já encontrados na pasta serão recuperados na próxima consulta.`, true);
      });
      updateMissingSummary();
    });
  });
}
renderDocuments();

function setStep(step) {
  currentStep = step;
  sections.forEach(section => section.classList.toggle("active", Number(section.dataset.step) === step));
  const percent = Math.round(step / sections.length * 100);
  progressBar.style.width = `${percent}%`;
  stepCaption.textContent = `Etapa ${step} de ${sections.length}`;
  progressPercent.textContent = `${percent}%`;
  backBtn.hidden = step === 1;
  nextBtn.hidden = step === sections.length;
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
  window.scrollTo({top: 0, behavior: "smooth"});
  if (step === 3) updateMissingSummary();
  updateSubmitVisibility();
}
function cpfValido(value) {
  const cpf = String(value || "").replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}
function validateCpf(show = true) {
  const field = document.querySelector("#cpf");
  const message = document.querySelector("#cpfMessage");
  const raw = field.value.replace(/\D/g, "");
  if (!raw) { field.setCustomValidity("Informe o CPF."); message.textContent = "CPF obrigatório."; message.className = "field-message error"; if (show) field.reportValidity(); return false; }
  if (!cpfValido(raw)) { field.setCustomValidity("CPF inválido. Confira os números digitados."); message.textContent = "CPF inválido. Confira os números digitados."; message.className = "field-message error"; if (show) field.reportValidity(); return false; }
  field.setCustomValidity(""); message.textContent = "CPF válido."; message.className = "field-message valid"; return true;
}
function fieldLabel(field) {
  const label = field.closest("label");
  return label ? label.childNodes[0].textContent.replace(/\s*\*\s*$/, "").trim() : (field.name || "Campo");
}
function missingFieldsForStep(step) {
  const missing = [];
  const section = sections[step - 1];
  for (const field of section.querySelectorAll("input,select")) {
    if (field.type === "file" || field.type === "checkbox" || field.disabled) continue;
    if (field.required && !String(field.value || "").trim()) missing.push(fieldLabel(field));
    else if (field.required && !field.checkValidity()) missing.push(fieldLabel(field));
  }
  if (step === 1 && document.querySelector("#cpf").value && !cpfValido(document.querySelector("#cpf").value)) missing.push("CPF válido");
  if (step === 2) {
    const cep = document.querySelector("#cep").value.replace(/\D/g, "");
    if (cep.length !== 8) missing.push("CEP com 8 números");
  }
  if (step === 3) {
    const selected = key => Boolean(form.elements[key]?.files?.length);
    documents.filter(d => d.required && !selected(d.key) && !uploadedKeys.has(d.key)).forEach(d => missing.push(d.title));
    if (!(selected("cnh") || uploadedKeys.has("cnh")) && !(selected("rg") || uploadedKeys.has("rg"))) missing.push("CNH ou RG");
    if (!(selected("cnh") || uploadedKeys.has("cnh")) && !(selected("cpfDoc") || uploadedKeys.has("cpfDoc"))) missing.push("CNH ou documento CPF");
    if ([...uploadingKeys].length) missing.push("Aguarde o término dos uploads em andamento");
    if (!form.elements.cientePrivacidade.checked) missing.push("Confirmação de leitura do aviso de privacidade");
  }
  return [...new Set(missing)];
}
function validateCurrentStep() {
  if (currentStep === 1 && !validateCpf(false)) { validateCpf(true); return false; }
  const missing = missingFieldsForStep(currentStep);
  if (missing.length) {
    const msg = "Para continuar, confira: " + missing.join("; ") + ".";
    showStatus(msg, true);
    const first = sections[currentStep - 1].querySelector(":invalid");
    if (first && !first.disabled) first.focus();
    return false;
  }
  for (const field of sections[currentStep - 1].querySelectorAll("input,select")) {
    if (field.disabled || field.type === "file" || field.type === "checkbox") continue;
    if (!field.checkValidity()) { field.reportValidity(); field.focus(); return false; }
  }
  if (currentStep === 3) {
    const bad = uploadList.querySelector(".file-error");
    if (bad) { showStatus("Corrija o arquivo marcado com erro antes de enviar.", true); bad.scrollIntoView({behavior:"smooth",block:"center"}); return false; }
  }
  return true;
}
function updateMissingSummary() {
  const missing = missingFieldsForStep(3);
  if (!missing.length) { missingSummary.classList.add("hidden"); missingSummary.textContent = ""; return; }
  missingSummary.classList.remove("hidden");
  missingSummary.innerHTML = `<strong>Antes de enviar, ainda falta:</strong><ul>${missing.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  updateSubmitVisibility();
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function showStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message " + (isError ? "error" : "success");
  statusMessage.scrollIntoView({behavior:"smooth", block:"center"});
}
function setOverall(percent, message) {
  const n = Math.max(0, Math.min(100, Math.round(percent)));
  overallProgress.style.width = `${n}%`; overallPercent.textContent = `${n}%`; overallMessage.textContent = message;
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}
nextBtn.addEventListener("click", async () => {
  if (!validateCurrentStep()) return;
  // Prepare the employee folder before the user reaches the document-upload step.
  if (currentStep === 2) {
    nextBtn.disabled = true;
    showStatus("Validando os dados e criando/localizando sua pasta individual no Drive…", false);
    try {
      await ensureCadastroSession();
      showStatus("Pasta individual preparada. Agora você pode enviar os documentos.", false);
      setStep(Math.min(currentStep + 1, sections.length));
    } catch (error) {
      showStatus("Não foi possível criar/localizar a pasta no Drive: " + (error.message || "verifique a configuração do Apps Script e o ID da pasta principal."), true);
    } finally {
      nextBtn.disabled = false;
      updateSubmitVisibility();
    }
    return;
  }
  setStep(Math.min(currentStep + 1, sections.length));
});
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
  event.target.setCustomValidity("");
  document.querySelector("#cpfMessage").textContent = "O CPF será validado ao sair deste campo.";
  document.querySelector("#cpfMessage").className = "field-message";
});
document.querySelector("#cpf").addEventListener("blur", () => validateCpf(true));
document.querySelector("#cpf").addEventListener("keydown", event => { if (event.key === "Tab") validateCpf(true); });

const addressIds = ["estado", "endereco", "numeroResidencia", "complemento", "bairro", "cidade"];
function updateAddressLock() {
  const digits = document.querySelector("#cep").value.replace(/\D/g, "");
  const unlock = digits.length === 8;
  addressIds.forEach(id => {
    const field = document.getElementById(id);
    if (field) field.disabled = !unlock;
  });
  if (!unlock) document.querySelector("#cepMessage").textContent = "Digite os 8 números do CEP para liberar os campos de endereço.";
  return unlock;
}
document.querySelector("#cep").addEventListener("input", event => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 8);
  if (v.length > 5) v = v.replace(/(\d{5})(\d{1,3})/, "$1-$2");
  event.target.value = v;
  updateAddressLock();
});
document.querySelector("#cep").addEventListener("blur", async () => {
  const cep = document.querySelector("#cep").value.replace(/\D/g, "");
  const msg = document.querySelector("#cepMessage");
  if (cep.length !== 8) { msg.textContent = "Informe um CEP com 8 números para continuar."; return; }
  msg.textContent = "Consultando CEP…";
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("Falha na consulta");
    const data = await response.json();
    if (data.erro) throw new Error("CEP não encontrado. Confira o CEP e preencha o endereço manualmente.");
    document.querySelector("#endereco").value = data.logradouro || "";
    document.querySelector("#bairro").value = data.bairro || "";
    document.querySelector("#cidade").value = data.localidade || "";
    document.querySelector("#estado").value = data.uf || "";
    // Ensure the fields stay enabled after the CEP lookup and autofill.
    updateAddressLock();
    msg.textContent = "CEP encontrado. Confira o endereço, informe o número e preencha o complemento se houver.";
  } catch (error) {
    msg.textContent = (error.message || "Não foi possível consultar o CEP.") + " Os campos estão liberados para preenchimento manual.";
  }
});
document.querySelector("#celular").addEventListener("input", event => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
  else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{1,4})/, "($1) $2-$3");
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, "($1) $2");
  event.target.value = v;
});

function fileToBase64(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = event => { if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total * 100); };
    reader.onload = () => { if (onProgress) onProgress(100); resolve(String(reader.result).split(",")[1]); };
    reader.onerror = () => reject(new Error(`Não foi possível preparar o arquivo ${file.name}.`));
    reader.readAsDataURL(file);
  });
}
function collectFormData() {
  const data = {};
  for (const [key, value] of new FormData(form).entries()) if (!(value instanceof File)) data[key] = value;
  data.cientePrivacidade = Boolean(form.elements.cientePrivacidade?.checked);
  return data;
}
async function postAction(payload) {
  const endpoint = window.APP_CONFIG?.APPS_SCRIPT_URL;
  if (!endpoint || endpoint.includes("COLE_A_URL")) throw new Error("Configure a URL do Apps Script em frontend/config.js.");
  const response = await fetch(endpoint, {method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload),redirect:"follow"});
  if (!response.ok) throw new Error("O servidor retornou um erro HTTP.");
  const result = await response.json();
  if (!result.ok) throw new Error(result.mensagem || "O servidor não confirmou a operação.");
  return result;
}
async function ensureCadastroSession() {
  if (cadastroId) return cadastroId;
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    if (!validateCpf(false)) throw new Error("Corrija o CPF na primeira etapa antes de enviar documentos.");
    const data = collectFormData();
    const result = await postAction({...data, acao:"iniciarCadastro", origem:window.location.href});
    cadastroId = result.cadastroId;
    (result.documentos || []).forEach(doc => {
      uploadedKeys.add(doc.chave);
      const status = document.querySelector(`#status-${CSS.escape(doc.chave)}`);
      const bar = document.querySelector(`#bar-${CSS.escape(doc.chave)}`);
      if (status) status.textContent = `Já salvo no Drive: ${doc.nome}`;
      if (bar) bar.style.width = "100%";
    });
    return cadastroId;
  })();
  try { return await sessionPromise; }
  finally { sessionPromise = null; }
}
async function refreshDriveDocuments() {
  if (!cadastroId) return;
  const data = collectFormData();
  const result = await postAction({acao:"listarDocumentos", cadastroId, cpf:data.cpf});
  (result.documentos || []).forEach(doc => {
    uploadedKeys.add(doc.chave);
    const status = document.querySelector(`#status-${CSS.escape(doc.chave)}`);
    const bar = document.querySelector(`#bar-${CSS.escape(doc.chave)}`);
    if (status && !uploadingKeys.has(doc.chave)) status.textContent = `Já salvo no Drive: ${doc.nome}`;
    if (bar && !uploadingKeys.has(doc.chave)) bar.style.width = "100%";
  });
}
async function uploadSelectedDocument(doc, file, input) {
  if (uploadingKeys.has(doc.key)) return;
  uploadingKeys.add(doc.key); uploadedKeys.delete(doc.key);
  updateSubmitVisibility();
  const status = document.querySelector(`#status-${doc.key}`);
  const bar = document.querySelector(`#bar-${doc.key}`);
  try {
    setOverall(5, `Preparando pasta e enviando ${doc.title}…`);
    const id = await ensureCadastroSession();
    status.textContent = `Preparando ${file.name}…`;
    const base64 = await fileToBase64(file, pct => {
      bar.style.width = `${Math.round(pct)}%`;
      setOverall(Math.min(90, pct * 0.9), `Enviando documento: ${doc.title}`);
    });
    status.textContent = `Enviando ao Drive: ${file.name}…`;
    const data = collectFormData();
    const result = await postAction({acao:"enviarDocumento", cadastroId:id, cpf:data.cpf, documento:{chave:doc.key,nome:doc.title,nomeArquivo:file.name,mimeType:file.type,tamanho:file.size,base64}});
    uploadedKeys.add(doc.key);
    status.textContent = `Enviado ao Drive · ${file.name}`;
    bar.style.width = "100%";
    document.querySelector(`[data-doc="${doc.key}"]`)?.classList.remove("file-error");
    setOverall(100, `${doc.title} salvo na pasta do funcionário.`);
    (result.documentos || []).forEach(saved => uploadedKeys.add(saved.chave));
  } catch (error) {
    try { await refreshDriveDocuments(); } catch (_) { /* Mantém a mensagem original do erro. */ }
    throw error;
  } finally {
    uploadingKeys.delete(doc.key);
    updateMissingSummary();
    updateSubmitVisibility();
  }
}
function updateSubmitVisibility() {
  const onFinalStep = currentStep === sections.length;
  const missing = missingFieldsForStep(1).length + missingFieldsForStep(2).length + missingFieldsForStep(3).length;
  const selectedPending = documents.some(d => form.elements[d.key]?.files?.length && !uploadedKeys.has(d.key));
  const anyUploading = uploadingKeys.size > 0 || Boolean(sessionPromise);
  const badFile = Boolean(uploadList.querySelector(".file-error"));
  submitBtn.hidden = !(onFinalStep && missing === 0 && !selectedPending && !anyUploading && !badFile && Boolean(cadastroId));
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (sending || !validateCurrentStep()) return;
  updateSubmitVisibility();
  if (submitBtn.hidden) {
    updateMissingSummary();
    showStatus("Ainda existem campos ou documentos pendentes. Confira a lista antes de concluir.", true);
    return;
  }
  sending = true; submitBtn.disabled = true; nextBtn.disabled = true; backBtn.disabled = true;
  const originalText = submitBtn.innerHTML;
  try {
    setOverall(95, "Conferindo os dados e os documentos já enviados ao Drive…");
    const result = await postAction({...collectFormData(), acao:"concluirCadastro", cadastroId, origem:window.location.href});
    setOverall(100, "Cadastro concluído com sucesso.");
    showStatus("Cadastro concluído. Os dados e documentos foram salvos.", false);
    form.reset(); uploadedKeys.clear(); uploadingKeys.clear(); cadastroId = null; updateAddressLock();
    submitBtn.hidden = true;
  } catch (error) {
    try { await refreshDriveDocuments(); } catch (_) { /* A mensagem de conclusão continua sendo exibida. */ }
    updateMissingSummary();
    showStatus("Não foi possível concluir o cadastro: " + (error.message || "verifique o acesso ao Drive."), true);
  } finally {
    sending = false; submitBtn.disabled = false; nextBtn.disabled = false; backBtn.disabled = false; submitBtn.innerHTML = originalText;
    updateMissingSummary(); updateSubmitVisibility();
  }
});
form.addEventListener("change", updateSubmitVisibility);
form.addEventListener("input", updateSubmitVisibility);
updateAddressLock();
setStep(1);
