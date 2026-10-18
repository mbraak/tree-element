const htmlElement = document.getElementById("tree1");

new TreeElement({
  ariaLabel: "Dinosaurs",
  autoOpen: 0,
  data: ExampleData.exampleData,
  dragAndDrop: true,
  htmlElement,
});
