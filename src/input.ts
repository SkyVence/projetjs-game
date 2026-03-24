const playerNameInput = document.createElement("input");
playerNameInput.id = "playerName";
playerNameInput.type = "text";
playerNameInput.placeholder = "Enter your name";
Object.assign(playerNameInput.style, {
  position: "absolute" as const,
  top: "clamp(100px, 20vh, 205px)",
  left: "clamp(310px, 5vw, 150px)",
  width: "clamp(100px, 30vw, 150px)",
  padding: "12px",
  fontSize: "clamp(16px, 2vw, 20px)",
  borderRadius: "8px",
  border: "2px solid #333",
  zIndex: "5",
});

export { playerNameInput };
