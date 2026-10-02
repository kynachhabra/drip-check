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

  /* ========== RATE MY OUTFIT ========== */
  const rateBox = document.querySelector(".rate-box");
  const fileInput = document.getElementById("outfitUpload");
  const preview = document.getElementById("outfitPreview");
  const changeBtn = document.getElementById("changePhotoBtn");
  const removeBtn = document.getElementById("removePhotoBtn");
  const rateBtn = document.getElementById("rateOutfitBtn");
  const statusEl = document.getElementById("rateStatus");
  let currentData = null; // the resized photo as a JPEG data URL

  function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.className = "rate-status" + (isError ? " error" : "");
  }

  function clearPhoto() {
    currentData = null;
    preview.removeAttribute("src");
    fileInput.value = "";
    rateBox.classList.remove("has-photo", "rated");
    setStatus("");
  }

  // Read the chosen file, shrink it, and return a JPEG data URL
  function fileToResizedJpeg(file, maxSize) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("This photo can't be read. Please try a JPG or PNG."));
      };
      img.src = url;
    });
  }

  fileInput.addEventListener("change", async function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (JPG, PNG or WEBP).");
      fileInput.value = "";
      return;
    }
    try {
      currentData = await fileToResizedJpeg(file, 1024);
    } catch (err) {
      alert(err.message);
      fileInput.value = "";
      return;
    }
    preview.src = currentData;
    rateBox.classList.add("has-photo");
    rateBox.classList.remove("rated");
    setStatus("");
    runRating(); // rate automatically as soon as the photo is chosen
  });

  changeBtn.addEventListener("click", function () { fileInput.click(); });
  removeBtn.addEventListener("click", clearPhoto);

  function showResult(r) {
    document.getElementById("overallScore").textContent = Number(r.score).toFixed(1);
    document.getElementById("scoreTitle").textContent = r.title;
    document.getElementById("scoreDescription").textContent = r.description;
    document.getElementById("workingText").textContent = r.working;
    document.getElementById("improveText").textContent = r.improve;
    rateBox.classList.add("rated");
    document.getElementById("ratingResult").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function runRating() {
    if (!currentData) return;
    rateBtn.disabled = true;
    rateBtn.textContent = "ANALYSING YOUR FIT…";
    setStatus("Our AI stylist is looking at your outfit. This takes a few seconds.");

    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: currentData })
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); }
      catch (e) { throw new Error("The rating service didn't reply properly (status " + res.status + "). Check that api/rate.js is in your GitHub repo."); }
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      if (!data.isOutfit) {
        setStatus("I couldn't spot an outfit in that photo. Try a clearer, well-lit photo of your full look.", true);
      } else {
        setStatus("");
        showResult(data);
      }
    } catch (err) {
      setStatus(err instanceof TypeError
        ? "Couldn't reach the rating service. Make sure you opened the live Vercel link, then try again."
        : err.message, true);
    } finally {
      rateBtn.disabled = false;
      rateBtn.textContent = "RATE AGAIN →";
    }
  }

  rateBtn.addEventListener("click", runRating);

  document.getElementById("resetRateBtn").addEventListener("click", function () {
    clearPhoto();
    document.getElementById("rate").scrollIntoView({ behavior: "smooth" });
  });

});
