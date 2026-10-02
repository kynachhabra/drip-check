document.addEventListener("DOMContentLoaded", function () {

  /* ========== STYLIST: OCCASION -> RESULT PAGE ========== */
  const occasionButtons = document.querySelectorAll(".occasion-btn");
  const analyzeButton = document.getElementById("analyzeBtn");
  const resultBox = document.getElementById("result");
  let selectedOccasion = "";

  occasionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      occasionButtons.forEach(function (btn) { btn.classList.remove("selected"); });
      button.classList.add("selected");
      selectedOccasion = button.textContent.trim();
      resultBox.innerHTML = "";
    });
  });

  analyzeButton.addEventListener("click", function () {
    if (selectedOccasion === "") {
      resultBox.innerHTML = '<p class="result-error">Pick an occasion first ✦</p>';
      return;
    }
    try { localStorage.setItem("occasion", selectedOccasion); } catch (e) {}
    window.location.href = "result.html?occasion=" + encodeURIComponent(selectedOccasion);
  });

  /* ========== RATE MY OUTFIT: PHOTO UPLOAD ========== */
  const rateBox = document.querySelector(".rate-box");
  const fileInput = document.getElementById("outfitUpload");
  const preview = document.getElementById("outfitPreview");
  const changeBtn = document.getElementById("changePhotoBtn");
  const removeBtn = document.getElementById("removePhotoBtn");
  const rateBtn = document.getElementById("rateOutfitBtn");
  const statusEl = document.getElementById("rateStatus");
  let currentUrl = null;

  function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.className = "rate-status" + (isError ? " error" : "");
  }

  function clearPhoto() {
    if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
    preview.removeAttribute("src");
    fileInput.value = "";
    rateBox.classList.remove("has-photo", "rated");
    setStatus("");
  }

  fileInput.addEventListener("change", function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (JPG, PNG or WEBP).");
      fileInput.value = "";
      return;
    }
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(file);
    preview.src = currentUrl;
    rateBox.classList.add("has-photo");
    rateBox.classList.remove("rated");
    setStatus("");
  });

  changeBtn.addEventListener("click", function () { fileInput.click(); });
  removeBtn.addEventListener("click", clearPhoto);

  /* ========== RATE MY OUTFIT: AI RATING ========== */
  // Works from the Node server (port 3000) or from VS Code Live Server.
  const API = ""; // same website, so the browser calls /api/rate directly

  // Shrink the photo so the upload is small and fast
  function photoToBase64(maxSize) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () { reject(new Error("Could not read that photo.")); };
      img.src = currentUrl;
    });
  }

  function showResult(r) {
    document.getElementById("overallScore").textContent = Number(r.score).toFixed(1);
    document.getElementById("scoreTitle").textContent = r.title;
    document.getElementById("scoreDescription").textContent = r.description;
    document.getElementById("workingText").textContent = r.working;
    document.getElementById("improveText").textContent = r.improve;

    const bars = document.getElementById("breakdownBars");
    bars.innerHTML = "";
    [["fit", "FIT & SILHOUETTE"], ["colour", "COLOUR"], ["shoes", "SHOES"],
     ["accessories", "ACCESSORIES"], ["vibe", "OVERALL VIBE"]].forEach(function (pair) {
      const val = Number(r.categories && r.categories[pair[0]]);
      if (!val) return;
      const row = document.createElement("div");
      row.className = "bar-row";
      const label = document.createElement("span");
      label.textContent = pair[1];
      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = Math.max(0, Math.min(10, val)) * 10 + "%";
      track.appendChild(fill);
      const num = document.createElement("b");
      num.textContent = val.toFixed(1);
      row.appendChild(label); row.appendChild(track); row.appendChild(num);
      bars.appendChild(row);
    });

    rateBox.classList.add("rated");
    document.getElementById("ratingResult").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  rateBtn.addEventListener("click", async function () {
    if (!currentUrl) return;
    rateBtn.disabled = true;
    rateBtn.textContent = "ANALYSING YOUR FIT…";
    setStatus("Our AI stylist is looking at your outfit. This takes a few seconds.");

    try {
      const image = await photoToBase64(1024);
      const res = await fetch(API + "/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: image })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      if (!data.isOutfit) {
        setStatus("I couldn't spot an outfit in that photo. Try a clearer, well-lit photo of your full look.", true);
      } else {
        setStatus("");
        showResult(data);
      }
    } catch (err) {
      const offline = err instanceof TypeError;
      setStatus(offline
        ? "Can't reach the Drip Check server. Start it with: node server.js"
        : err.message, true);
    } finally {
      rateBtn.disabled = false;
      rateBtn.textContent = "RATE MY OUTFIT →";
    }
  });

  document.getElementById("resetRateBtn").addEventListener("click", function () {
    clearPhoto();
    document.getElementById("rate").scrollIntoView({ behavior: "smooth" });
  });

});