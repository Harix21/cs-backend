function showFeedback(title, message, type = "error") {
  let dialog = document.querySelector("#feedbackDialog");
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "feedbackDialog";
    dialog.className = "feedback-backdrop";
    dialog.innerHTML = '<div class="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedbackTitle"><button class="feedback-close" type="button" aria-label="Close">&times;</button><div class="feedback-icon"></div><h2 id="feedbackTitle"></h2><p class="feedback-message"></p><button class="btn btn-primary feedback-action" type="button">Continue</button></div>';
    document.body.appendChild(dialog);
    const close = () => dialog.classList.remove("show");
    dialog.querySelector(".feedback-close").onclick = close;
    dialog.querySelector(".feedback-action").onclick = close;
    dialog.onclick = event => { if (event.target === dialog) close(); };
  }
  dialog.className = `feedback-backdrop ${type} show`;
  dialog.querySelector("#feedbackTitle").textContent = title;
  dialog.querySelector(".feedback-message").textContent = message;
  dialog.querySelector(".feedback-icon").textContent = type === "success" ? "OK" : "!";
}