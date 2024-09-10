let imageFiles = [];
let currentIndex = 0;
let annotations = {};
let imageCanvas = document.getElementById("imageCanvas");
let crosshairCanvas = document.getElementById("crosshairCanvas");
let annCanvas = document.getElementById("annCanvas");
let maskCanvas = document.getElementById("maskCanvas");

let tmpCanvas = document.getElementById("tmpCanvas");
let imageCtx = imageCanvas.getContext("2d");
let crosshairCtx = crosshairCanvas.getContext("2d");
let annCtx = annCanvas.getContext("2d");
let maskCtx = maskCanvas.getContext("2d");
maskCtx.globalAlpha = 0.3; // Default mask transparency
let tmpCtx = tmpCanvas.getContext("2d");
let currentImage = null;
let maskImage = null;
let margin = 20; // Margin around the image
let dragging = false;
let lastX = 0;
let lastY = 0;
let translateX = 0;
let translateY = 0;
let scale = 1;
const rs = 5; // radius of the square representing the point
let annotationMode = "point"; // or 'bbox'
let bboxStart = null;
let drawingBbox = false;
let navigationActive = true;
let currentFile = null;

document
  .getElementById("selectFolderButton")
  .addEventListener("click", function () {
    document.getElementById("folderInput").click();
  });

document.addEventListener("keydown", function (event) {
  if (
    navigationActive &&
    (event.key === "ArrowLeft")
  ) {
    // Simulate a click on the "Previous" button
    document.getElementById("prevButton").click();
  } else if (
    navigationActive &&
    (event.key === "ArrowRight")
  ) {
    // Simulate a click on the "Next" button
    document.getElementById("nextButton").click();
  }
});

document
  .getElementById("folderInput")
  .addEventListener("change", function (event) {
    const files = event.target.files;
    imageFiles = [];
    annotations = {};

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      document.getElementById("selectFolderButton").style.display = "none";
      document.getElementById("privacy").style.display = "none";

      // Remove 'hidden' class from all elements with the class 'btn' or 'dropdown-container'
      document
        .querySelectorAll(".btn, .dropdown-container")
        .forEach((element) => {
          element.classList.remove("hidden");
        });

      // Remove 'hiden' for the other containers
      document.getElementById("canvasContainer").classList.remove("hidden");
      document
        .getElementById("annotationInputContainer")
        .classList.remove("hidden");
      document.getElementById("sliderContainer").classList.remove("hidden");
      document.getElementById("switch-container").style.display = "flex";

      loadSample();
    } else {
      alert("No images found in the folder.");
    }
  });

// Get the modal
var modal = document.getElementById("helpModal");

// Get the button that opens the modal
var btn = document.getElementById("helpButton");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal
btn.onclick = function () {
  modal.style.display = "block";
};

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

document
  .getElementById("loadAnnotationsButton")
  .addEventListener("click", function () {
    document.getElementById("loadFileInput").click(); // Trigger file selection
  });

document
  .getElementById("loadFileInput")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const loadedAnnotations = JSON.parse(e.target.result);
          if (typeof loadedAnnotations === "object") {
            annotations = loadedAnnotations;
            renderAll(); // Update the canvas with loaded annotations
            alert("Annotations loaded successfully.");
          } else {
            throw new Error("Format is not correct");
          }
        } catch (err) {
          alert("Failed to load annotations: " + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      alert("Please select a valid JSON file.");
    }
    this.value = ""; // Reset the input after the file is loaded
  });

document.getElementById("toggleModeButton").addEventListener("change", function () {
  console.log("Switching annotation mode");
  const label = document.getElementById("switchLabel"); 
  if (this.checked) { 
    annotationMode = "bbox"; 
    label.textContent = "Box Mode"; 
  } else {
    annotationMode = "point";
    label.textContent = "Point Mode";
  }
});
  


document.getElementById("nextButton").addEventListener("click", function () {
  if (currentIndex < imageFiles.length - 1) {
    currentIndex++;
    loadSample();
  }
});

document.getElementById("prevButton").addEventListener("click", function () {
  if (currentIndex > 0) {
    currentIndex--;
    loadSample();
  }
});

document
  .getElementById("resetViewButton")
  .addEventListener("click", function () {
    resetViewParams();
    renderAll();
  });

document.getElementById("clearButton").addEventListener("click", function () {
  annotations[currentFile] = [];
  renderAll();
});

document.getElementById("undoButton").addEventListener("click", function () {
  undoLastAnnotation();
});

document.addEventListener("keydown", function (event) {
  if (event.ctrlKey && event.key === "z") {
    undoLastAnnotation();
  } else if (event.ctrlKey && event.key === "w") {
    undoLastAnnotation();
  }
  else if (event.ctrlKey && event.key === "/") {
    console.log(annotations[currentFile]);
  }
});

function undoLastAnnotation() {
  if (annotations[currentFile] && annotations[currentFile].length > 0) {
    annotations[currentFile].pop();
    renderAll();
  } else {
    console.log("No annotations to undo.");
  }
}

document
  .getElementById("downloadButton")
  .addEventListener("click", function () {
    downloadAnnotations();
  });

document
  .getElementById("readabilityDropdown")
  .addEventListener("change", function () {
    const selectedValue = this.value;
    annotations[currentFile].forEach((ann_) => {
      if (ann_.type == "readability") {
        ann_.value = selectedValue;
        flag_never_annotated = false;
      }
    });
    renderAll(); // update the canvas with new annotation
  });

document
  .getElementById("imageQualityDropdown")
  .addEventListener("change", function () {
    const selectedValue = this.value;
    annotations[currentFile].forEach((ann_) => {
      if (ann_.type == "imageQuality") {
        ann_.value = selectedValue;
      }
    });
    renderAll(); // update the canvas with new annotation
  });

  function downloadAnnotations() {
    let description = "";

    // Remove the color property from all annotations
    annotations[currentFile].forEach((ann) => {
      if ('color' in ann) {
        delete ann.color; 
      }
      // copy all the description if there 
      if (ann.type == "bbox" || ann.type == "positive" || ann.type == "negative") {
        description += ann.description;
        description += "\n";
      }
    });

    annotations[currentFile].push({"type":"desc","description":description});


    // Convert the annotations object to a JSON string
    let dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(annotations));
    let downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "annotations.json");
    document.body.appendChild(downloadAnchorNode); // Required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
  

// Function to update mask transparency
function updateMaskOpacity(value) {
  renderAll();
}

// Debounce function to limit excessive updates
function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Event listener for the slider with a debounced update
const alphaSlider = document.getElementById("alphaSlider");
const debouncedUpdate = debounce(updateMaskOpacity, 100);
alphaSlider.addEventListener("input", function () {
  debouncedUpdate(this.value);
});

// mouse move
crosshairCanvas.addEventListener("mousemove", function (event) {
  // Draw the crosshair when not on the borders
  drawCrosshair(event.offsetX, event.offsetY);

  clicking = false; // mouse moved, not a click
  if (drawingBbox) {
    tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    tmpCtx.strokeStyle = "violet";
    tmpCtx.lineWidth = 4;
    let x1 = Math.min(event.offsetX, bboxStart.x * scale + translateX);
    let y1 = Math.min(event.offsetY, bboxStart.y * scale + translateY);
    let x2 = Math.max(event.offsetX, bboxStart.x * scale + translateX);
    let y2 = Math.max(event.offsetY, bboxStart.y * scale + translateY);
    tmpCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }
  if (dragging) {
    let dx = event.offsetX - lastX;
    let dy = event.offsetY - lastY;
    translateX += dx;
    translateY += dy;
    lastX = event.offsetX;
    lastY = event.offsetY;
    renderAll();
  }
});

window.addEventListener("contextmenu", function (event) {
  console.log("contextmenu window");
  event.preventDefault();
});

// click
crosshairCanvas.addEventListener("mousedown", function (event) {
  clicking = true;
  if (event.button === 0) {
    // Check if left mouse button is pressed
    dragging = true;
    lastX = event.offsetX;
    lastY = event.offsetY;
  }
});

crosshairCanvas.addEventListener("mouseup", function (event) {
  if (clicking) {
    if (event.button === 0) {
      // Ensure the left mouse button was released
      if (annotationMode === "point") {
        addPoint(
          (event.offsetX - translateX) / scale,
          (event.offsetY - translateY) / scale,
          "positive"
        );
      } else if (annotationMode === "bbox") {
        if (!bboxStart) {
          // First click sets the start of the bounding box
          bboxStart = {
            x: (event.offsetX - translateX) / scale,
            y: (event.offsetY - translateY) / scale,
          };
          drawingBbox = true;
        } else {
          // Second click sets the end of the bounding box and creates it
          addBoundingBox(bboxStart, {
            x: (event.offsetX - translateX) / scale,
            y: (event.offsetY - translateY) / scale,
          });
          bboxStart = null; // Reset for next bounding box
          drawingBbox = false;
        }
      }
    }
    if (event.button === 2) {
      // Ensure the right mouse button was released
      if (annotationMode === "point") {
        addPoint(
          (event.offsetX - translateX) / scale,
          (event.offsetY - translateY) / scale,
          "negative"
        );
      } else if (annotationMode === "bbox") {
        // Right click does nothing in bbox mode
        bboxStart = null;
        drawingBbox = false;
        tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
      }
    }
    clicking = false;
  }
});

window.addEventListener("mouseup", function (event) {
  if (event.button === 0) {
    // Ensure the left mouse button was released
    dragging = false;
  }
});

crosshairCanvas.addEventListener("wheel", function (event) {
  event.preventDefault();
  const zoomSpeed = 0.1;
  let delta = -Math.sign(event.deltaY) * zoomSpeed;
  let zoomFactor = Math.exp(delta);
  scale *= zoomFactor;

  // translation comes from the equality (tx - eo) / s1 = (tx2 - eo) / s2 which means that the relative position of eo wrt tx should be constant
  translateX = (translateX - event.offsetX) * zoomFactor + event.offsetX;
  renderAll();
});

const distinctCssColors = [
  "#b4f0e9", "#b917cf", "#f0b4d1", "#17aacf", "#e4f0b4", 
  "#cf1757", "#b4d7f0", "#f0b4be", "#599e8d", "#a7cf17",
  "#9a17cf", "#17cfa1", "#b4c1f0", "#f0c9b4", "#82cf17",
  "#cf172c", "#b4f0d4", "#cfb4f0", "#17cfc8", "#e5b4f0",
  "#78ad6d", "#172ccf", "#1776cf", "#f0d9b4", "#c6f0b4", 
  "#bbb4f0", "#cf5a17", "#6917cf", "#cf9117", "#bfcf17",
];



function addPoint(x, y, type) {
  console.log("Adding point at", x, y, type);
  // Save the annotation
  annotations[currentFile].push({
    imgX: x,
    imgY: y,
    description: "", 
    type: type,
  });
  renderAll(); // Update the canvas with new point
}

function addBoundingBox(start, end) {
  let bbox = {
    x1: Math.min(start.x, end.x),
    y1: Math.min(start.y, end.y),
    x2: Math.max(start.x, end.x),
    y2: Math.max(start.y, end.y),
    description: "", 
    type: "bbox",
  };
  annotations[currentFile].push(bbox);
  renderAll();
}

function renderAll(focusedIndex) {
  tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
  annCtx.clearRect(0, 0, annCanvas.width, annCanvas.height);
  drawImage(); 

  if (maskImage) {
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.globalAlpha = alphaSlider.value / 100;
    maskCtx.drawImage(
      maskImage,
      translateX,
      translateY,
      maskImage.width * scale,
      maskImage.height * scale
    );
  }

  if (!focusedIndex) {
    // Clear the annotation input container
    const annotationInputContainer = document.getElementById("annotationInputContainer");
    annotationInputContainer.innerHTML = ""; // Clear any previous inputs
  }

  // Loop through each annotation
  annotations[currentFile].forEach((ann, index) => {
    if (!focusedIndex && (ann.type == "bbox" || ann.type == "positive" || ann.type == "negative")) {
      // Create the div with class 'inputdiv'
      let inputDiv = document.createElement("div");
      inputDiv.classList.add("inputdiv");
    
      // Create the span with the letter 'O'
      let span = document.createElement("span");
      span.classList.add("inputspan");

      // Create the input field dynamically for descriptions
      let input = document.createElement("input");
      input.type = "text";
      input.value = ann.description || "";
      input.placeholder = `Description for annotation ${index - 1}`;

      let button = document.createElement("button");
      button.textContent = `🗑`;
      button.classList.add("inputbutton");


      if (ann.type === "bbox") {
        if (!ann.color) {
            ann.color = distinctCssColors[index % distinctCssColors.length];
         }
        input.style.border = `2px solid ${ann.color}`; 
        span.textContent = "□";
        span.style.color = ann.color; 
      } else if (ann.type === "positive") {
        input.style.border = `2px solid green`;
        span.textContent = "•";
        span.style.color = "green"; 
      } else if (ann.type === "negative") {
        input.style.border = `2px solid red`;
        span.textContent = "•";
        span.style.color = "red"; 
      }

      button.addEventListener("click", function () {
        annotations[currentFile].splice(index,1)
        renderAll();
      });

      // Add an event listener to update the annotation description on input change
      input.addEventListener("input", function () {
        annotations[currentFile][index].description = this.value;
      });

      input.addEventListener("focus", function () {
        renderAll(index);
      });
      input.addEventListener("focusout", function () {
        renderAll();
      });
    
      // Append the span and input to the div
      inputDiv.appendChild(button);
      inputDiv.appendChild(input);
      inputDiv.appendChild(span);

    
      // Append the div to the annotation input container
      annotationInputContainer.appendChild(inputDiv);

    }

    if (ann.type === "bbox") {
      annCtx.strokeStyle = focusedIndex === index ? "fuchsia" : ann.color;
      annCtx.lineWidth = focusedIndex === index ? 6 : 4;
      let x1 = ann.x1 * scale + translateX;
      let y1 = ann.y1 * scale + translateY;
      let x2 = ann.x2 * scale + translateX;
      let y2 = ann.y2 * scale + translateY;
      annCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    }

    if (ann.type == "readability") {
      document.getElementById("readabilityDropdown").value = ann.value;
    } else if (ann.type == "imageQuality") {
      document.getElementById("imageQualityDropdown").value = ann.value;
    } else {
      if (ann.type === "positive") {
        annCtx.fillStyle = focusedIndex === index ? "fuchsia" : "green";
      } else if (ann.type === "negative") {
        annCtx.fillStyle = focusedIndex === index ? "fuchsia" : "red";
      }
      let x = ann.imgX * scale + translateX;
      let y = ann.imgY * scale + translateY;
      annCtx.fillRect(x - rs, y - rs, 2 * rs + 1, 2 * rs + 1);
    }
  });

}

function applyClamping() {
  translateX = Math.max(
    Math.min(imageCanvas.width - margin, translateX),
    margin - currentImage.width * scale
  );
  translateY = Math.max(
    Math.min(imageCanvas.height - margin, translateY),
    margin - currentImage.height * scale
  );
}

function drawImage() {
  imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
  applyClamping();
  imageCtx.drawImage(
    currentImage,
    translateX,
    translateY,
    currentImage.width * scale,
    currentImage.height * scale
  );
}

function drawCrosshair(x, y) {
  // Clear the previous crosshair
  crosshairCtx.clearRect(0, 0, crosshairCanvas.width, crosshairCanvas.height);

  // Tolerance to handle near-border cases (allow 1px tolerance)
  const tolerance = 5;

  // Check if the mouse is near the borders, if so, stop drawing
  if (x <= tolerance || x >= crosshairCanvas.width - tolerance ||
      y <= tolerance || y >= crosshairCanvas.height - tolerance) {
    return; // Do nothing if near the borders
  }

  // If not near the borders, draw the crosshair
  crosshairCtx.strokeStyle = "red";
  crosshairCtx.beginPath();
  crosshairCtx.moveTo(x, 0);
  crosshairCtx.lineTo(x, crosshairCanvas.height);
  crosshairCtx.moveTo(0, y);
  crosshairCtx.lineTo(crosshairCanvas.width, y);
  crosshairCtx.stroke();
}


function resetViewParams() {
  let maxCanvasWidth = imageCanvas.width - 2 * margin;
  let maxCanvasHeight = imageCanvas.height - 2 * margin;
  scale = Math.min(
    maxCanvasWidth / currentImage.width,
    maxCanvasHeight / currentImage.height
  );
  translateX = (imageCanvas.width - currentImage.width * scale) / 2;
  translateY = (imageCanvas.height - currentImage.height * scale) / 2;
}

function loadSample() {
  if (currentIndex >= 0 && currentIndex < imageFiles.length) {
    currentFile = imageFiles[currentIndex].name;
    annotations[currentFile] = annotations[currentFile] || [
      {"type":"imageQuality","value":""},{"type":"readability","value":""}
    ];
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      currentImage = new Image();
      currentImage.onload = () => {
        imageCanvas.width =
          crosshairCanvas.width =
          annCanvas.width =
          tmpCanvas.width =
          maskCanvas.width =
            canvasContainer.clientWidth;
        imageCanvas.height =
          crosshairCanvas.height =
          annCanvas.height =
          tmpCanvas.height =
          maskCanvas.height =
            canvasContainer.clientHeight;

        // Reset zoom and translation
        resetViewParams();
        renderAll();
      };
      currentImage.src = e.target.result;
    };
    fileReader.readAsDataURL(imageFiles[currentIndex]);

    let baseName = currentFile.replace(/\.[^/.]+$/, ""); // Remove extension
    let maskName = baseName + "_mask.png";
    let maskFile = Array.from(imageFiles).find(
      (file) => file.name === maskName
    );
    if (maskFile) {
      const maskReader = new FileReader();
      maskReader.onload = function (e) {
        maskImage = new Image();
        maskImage.onload = () => {
          // check that the mask is the same size as the image
          if (
            maskImage.width !== currentImage.width ||
            maskImage.height !== currentImage.height
          ) {
            alert(
              "Mask image size does not match the image size. Mask will not be displayed."
            );
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            document.getElementById("sliderContainer").classList.add("hidden"); // Hide slider if no mask available
            return;
          }

          // cleared before
          // clamped view params before
          document.getElementById("sliderContainer").classList.remove("hidden"); // Show slider if mask available
          renderAll();
        };
        maskImage.src = e.target.result;
      };
      maskReader.readAsDataURL(maskFile);
    } else {
      maskImage = null;
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      document.getElementById("sliderContainer").classList.add("hidden"); // Hide slider if no mask available
    }
  } else {
    alert("Index out of bounds. This should not happen.");
  }
}
