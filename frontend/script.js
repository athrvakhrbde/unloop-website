const apiBase = "/api";

async function submitForm(form, payload, endpoint) {
  const statusEl = form.querySelector("[data-status]");
  statusEl.textContent = "Submitting…";

  try {
    const res = await fetch(`${apiBase}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Submission failed");

    statusEl.textContent = "Thank you. We will reach out shortly.";
    form.reset();
  } catch (err) {
    statusEl.textContent = err.message;
  }
}

function getValue(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  return el ? el.value.trim() : "";
}

function tagsFromForm(form) {
  const tags = [];
  const urgency = getValue(form, "urgency");
  const segment = getValue(form, "segment");
  if (urgency) tags.push(`urgency_${urgency}`);
  if (segment) tags.push(segment);
  return tags;
}

function handleClientForm(form, extraTags = []) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (getValue(form, "website")) return;

    const preferences = {
      language: getValue(form, "language"),
      session_type: getValue(form, "session_type")
    };

    const payload = {
      name: getValue(form, "name"),
      email: getValue(form, "email"),
      phone: getValue(form, "phone"),
      primary_concern: getValue(form, "primary_concern"),
      budget_cents: Number(getValue(form, "budget")) * 100 || null,
      preferences,
      tags: [...tagsFromForm(form), ...extraTags],
      notes: getValue(form, "notes")
    };

    submitForm(form, payload, "/public/clients");
  });
}

function handleTherapistForm(form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (getValue(form, "website")) return;

    const payload = {
      name: getValue(form, "name"),
      email: getValue(form, "email"),
      phone: getValue(form, "phone"),
      qualifications: getValue(form, "qualifications"),
      specializations: getValue(form, "specializations"),
      languages: getValue(form, "languages"),
      fee_cents: Number(getValue(form, "fee")) * 100 || 0,
      availability: getValue(form, "availability"),
      experience_years: getValue(form, "experience"),
      notes: getValue(form, "notes")
    };

    submitForm(form, payload, "/public/mhps");
  });
}

function handleAdhdForm(form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (getValue(form, "website")) return;

    const payload = {
      name: getValue(form, "name"),
      email: getValue(form, "email"),
      phone: getValue(form, "phone"),
      primary_concern: "ADHD Cohort",
      preferences: {},
      tags: ["adhd_cohort"],
      notes: getValue(form, "notes")
    };

    submitForm(form, payload, "/public/clients");
  });
}

document.querySelectorAll("form[data-form]").forEach((form) => {
  const type = form.getAttribute("data-form");
  if (type === "client") handleClientForm(form, ["looking_for_therapist"]);
  if (type === "therapist") handleTherapistForm(form);
  if (type === "adhd") handleAdhdForm(form);
});

document.querySelectorAll("form[data-stepper]").forEach((form) => {
  const steps = Array.from(form.querySelectorAll("[data-step]"));
  const progress = form.querySelector("[data-progress]");
  const prevBtn = form.querySelector("[data-prev]");
  const nextBtn = form.querySelector("[data-next]");
  const submitBtn = form.querySelector("[data-submit]");
  let current = 0;

  const update = () => {
    steps.forEach((step, idx) => {
      step.classList.toggle("active", idx === current);
    });
    const pct = Math.round(((current + 1) / steps.length) * 100);
    if (progress) progress.style.width = `${pct}%`;
    if (prevBtn) prevBtn.style.display = current === 0 ? "none" : "inline-flex";
    if (nextBtn) nextBtn.style.display = current === steps.length - 1 ? "none" : "inline-flex";
    if (submitBtn) submitBtn.style.display = current === steps.length - 1 ? "inline-flex" : "none";
  };

  const canAdvance = () => {
    const inputs = steps[current].querySelectorAll("input, select, textarea");
    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
        return false;
      }
    }
    return true;
  };

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (current > 0) {
        current -= 1;
        update();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!canAdvance()) return;
      if (current < steps.length - 1) {
        current += 1;
        update();
      }
    });
  }

  update();
});
