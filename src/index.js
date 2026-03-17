document.addEventListener("DOMContentLoaded", function() {
  const btn = document.createElement("button");
  btn.innerText = "This is btn created through the dom";
  document.body.appendChild(btn);
  btn.addEventListener("click", function() {
      console.log("btn clicked");
  });
})
