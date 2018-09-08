const stdin = (function() {
  let cbPress = {};
  let cbEnter = {};

  const keyboard = document.getElementById("keyboard");
  keyboard.addEventListener("keypress", event => {
    console.log("press", event.key);
    Object.values(cbPress).forEach(cb => cb(event));

    if (event.key === "Enter") {
      const text = keyboard.value;
      keyboard.value = "";
      Object.values(cbEnter).forEach(cb => cb(text));
    }
  });

  return {
    onPress: function(callback) {
      const id = Date.now();
      cbPress[id] = callback;
      return id;
    },
    onEnter: function(callback) {
      const id = Date.now();
      cbEnter[id] = callback;
      return id;
    },
    cancel: function(id) {
      delete cbPress[id];
      delete cbEnter[id];
    }
  };
})();

const stdout = {
  screen: document.getElementById("screen"),
  print: function(...text) {
    this.screen.innerHTML += "\n" + text.join(" ");
  }
};
