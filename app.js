// Grading configuration based on provided university rules
const GRADING_SYSTEM = {
  maxGpa: 4.0,
  minDegreeCgpa: 2.0,
  rounding: {
    type: "ceiling",
    description: "Any fractional mark is rounded up to the next integer.",
  },
  gradeScale: [
    { min: 85, max: 100, letter: "A", gp: 4.0 },
    { min: 80, max: 84, letter: "A-", gp: 3.7 },
    { min: 75, max: 79, letter: "B+", gp: 3.3 },
    { min: 70, max: 74, letter: "B", gp: 3.0 },
    { min: 65, max: 69, letter: "B-", gp: 2.7 },
    { min: 61, max: 64, letter: "C+", gp: 2.3 },
    { min: 58, max: 60, letter: "C", gp: 2.0 },
    { min: 55, max: 57, letter: "C-", gp: 1.7 },
    { min: 50, max: 54, letter: "D", gp: 1.0 },
    { min: 0, max: 49, letter: "F", gp: 0.0 },
  ],
  excludedStatuses: ["W", "FW"],
  incompleteStatus: "I",
};

const dom = {
  modeSelect: document.getElementById("calculation-mode"),
  modeDescription: document.getElementById("mode-description"),
  resultLabel: document.getElementById("result-label"),
  resultValue: document.getElementById("result-value"),
  resultSubtitle: document.getElementById("result-subtitle"),
  eligibilityBadge: document.getElementById("eligibility-badge"),
  totalCredits: document.getElementById("total-credits"),
  totalWeighted: document.getElementById("total-weighted"),
  messageList: document.getElementById("message-list"),
  previousCgpaPanel: document.getElementById("previous-cgpa-panel"),
  previousCgpaInput: document.getElementById("previous-cgpa"),
  previousTotalCreditsInput: document.getElementById("previous-total-credits"),
  addRowBtn: document.getElementById("add-row-btn"),
  calculateBtn: document.getElementById("calculate-btn"),
  clearAllBtn: document.getElementById("clear-all-btn"),
  tbody: document.getElementById("courses-tbody"),
  rowTemplate: document.getElementById("course-row-template"),
};

function ceilMark(value) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.ceil(value);
}

function findGrade(roundedMark) {
  if (roundedMark == null) return null;
  for (const entry of GRADING_SYSTEM.gradeScale) {
    if (roundedMark >= entry.min && roundedMark <= entry.max) {
      return entry;
    }
  }
  return null;
}

function parseCoursesFromTable() {
  const rows = Array.from(dom.tbody.querySelectorAll("tr"));
  return rows.map((row) => {
    const courseCode = row
      .querySelector('input[name="course_code"]')
      .value.trim();
    const creditStr = row
      .querySelector('input[name="credit_hours"]')
      .value.trim();
    const marksStr = row
      .querySelector('input[name="obtained_marks"]')
      .value.trim();

    const creditHours = creditStr === "" ? null : Number(creditStr);
    const obtainedMarks = marksStr === "" ? null : Number(marksStr);

    return {
      row,
      courseCode,
      creditHours,
      obtainedMarks,
    };
  });
}

function clearMessages() {
  dom.messageList.innerHTML = "";
}

function addMessage(text, type = "info") {
  const li = document.createElement("li");
  li.textContent = text;
  li.classList.add(
    type === "warn" ? "message-list__item--warn" : "message-list__item--info"
  );
  dom.messageList.appendChild(li);
}

function resetResultsDisplay() {
  dom.resultValue.textContent = "–";
  dom.totalCredits.textContent = "0";
  dom.totalWeighted.textContent = "0.00";
  dom.eligibilityBadge.hidden = true;
  dom.eligibilityBadge.textContent = "";
  dom.eligibilityBadge.classList.remove("ok", "warn");
}

function updateModeText() {
  const mode = dom.modeSelect.value;

  if (mode === "semester") {
    dom.modeDescription.textContent =
      "Enter all courses for a single semester to calculate your GPA.";
    dom.resultLabel.textContent = "Semester GPA";
    dom.resultSubtitle.textContent =
      "Based on all valid courses in the current semester.";
    dom.previousCgpaPanel.hidden = true;
  } else if (mode === "cgpa") {
    dom.modeDescription.textContent =
      "Enter all completed courses across all semesters to calculate your cumulative CGPA.";
    dom.resultLabel.textContent = "CGPA";
    dom.resultSubtitle.textContent =
      "Based directly on all individual courses, not an average of semester GPAs.";
    dom.previousCgpaPanel.hidden = true;
  } else if (mode === "cgpa_update") {
    dom.modeDescription.textContent =
      "Enter this semester's courses and your previous CGPA record to compute the updated CGPA.";
    dom.resultLabel.textContent = "Updated CGPA";
    dom.resultSubtitle.textContent =
      "Computed from previous CGPA and credits plus this semester's GPA and credits.";
    dom.previousCgpaPanel.hidden = false;
  }
}

function computeGpaOrCgpa() {
  clearMessages();
  resetResultsDisplay();

  const mode = dom.modeSelect.value; // "semester", "cgpa", or "cgpa_update"
  const isCgpaLike = mode === "cgpa" || mode === "cgpa_update";

  const courses = parseCoursesFromTable();

  if (!courses.length) {
    addMessage("Add at least one course before calculating.", "warn");
    return;
  }

  let totalWeighted = 0;
  let totalCredits = 0;

  for (const course of courses) {
    const { row, creditHours, obtainedMarks } = course;

    const letterCell = row.querySelector('[data-field="letter_grade"]');
    const gpCell = row.querySelector('[data-field="grade_point"]');
    const weightedCell = row.querySelector('[data-field="weighted_points"]');

    letterCell.textContent = "–";
    gpCell.textContent = "–";
    weightedCell.textContent = "–";

    if (!creditHours || creditHours <= 0) {
      continue;
    }

    if (obtainedMarks == null || Number.isNaN(obtainedMarks)) {
      continue;
    }

    const rounded = ceilMark(obtainedMarks);
    const grade = findGrade(rounded);

    if (!grade) {
      addMessage(
        `Marks ${obtainedMarks} (rounded to ${rounded}) are out of the valid range 0–100 and were ignored.`,
        "warn"
      );
      continue;
    }

    const weighted = creditHours * grade.gp;

    letterCell.textContent = grade.letter;
    gpCell.textContent = grade.gp.toFixed(2);
    weightedCell.textContent = weighted.toFixed(2);

    totalWeighted += weighted;
    totalCredits += creditHours;
  }

  if (totalCredits === 0) {
    addMessage(
      "No valid courses were included in the calculation. Check credit hours and marks.",
      "warn"
    );
    return;
  }

  // Semester and CGPA modes use direct weighted average over all courses.
  if (mode === "semester" || mode === "cgpa") {
    let value = totalWeighted / totalCredits;
    if (value > GRADING_SYSTEM.maxGpa) {
      value = GRADING_SYSTEM.maxGpa;
    }

    dom.resultValue.textContent = value.toFixed(2);
    dom.totalCredits.textContent = totalCredits.toFixed(1).replace(/\.0$/, "");
    dom.totalWeighted.textContent = totalWeighted.toFixed(2);

    // Auto-scroll to results on mobile
    if (window.innerWidth <= 880) {
      document
        .querySelector(".results-grid")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (isCgpaLike) {
      if (value >= GRADING_SYSTEM.minDegreeCgpa) {
        dom.eligibilityBadge.hidden = false;
        dom.eligibilityBadge.classList.add("ok");
        dom.eligibilityBadge.textContent =
          "Meets minimum CGPA requirement for degree";
      } else {
        dom.eligibilityBadge.hidden = false;
        dom.eligibilityBadge.classList.add("warn");
        dom.eligibilityBadge.textContent =
          "Below minimum CGPA 2.00 required for degree";
      }
    }

    return;
  }

  // Updated CGPA mode: combine previous CGPA record with this semester's GPA.
  if (mode === "cgpa_update") {
    const prevCgpaRaw = dom.previousCgpaInput.value.trim();
    const prevCreditsRaw = dom.previousTotalCreditsInput.value.trim();

    const prevCgpa = prevCgpaRaw === "" ? NaN : Number(prevCgpaRaw);
    const prevCredits = prevCreditsRaw === "" ? NaN : Number(prevCreditsRaw);

    if (
      Number.isNaN(prevCgpa) ||
      Number.isNaN(prevCredits) ||
      prevCredits <= 0
    ) {
      addMessage(
        "Enter a valid previous CGPA and total completed credit hours (credits must be greater than 0).",
        "warn"
      );
      return;
    }

    const previousWeightedPoints = prevCgpa * prevCredits;
    const currentWeightedPoints = totalWeighted;
    const currentCredits = totalCredits;

    const newTotalWeightedPoints =
      previousWeightedPoints + currentWeightedPoints;
    const newTotalCredits = prevCredits + currentCredits;

    if (newTotalCredits === 0) {
      addMessage(
        "Total credits from previous record and current semester are zero.",
        "warn"
      );
      return;
    }

    let updatedCgpa = newTotalWeightedPoints / newTotalCredits;
    if (updatedCgpa > GRADING_SYSTEM.maxGpa) {
      updatedCgpa = GRADING_SYSTEM.maxGpa;
    }

    dom.resultValue.textContent = updatedCgpa.toFixed(2);
    dom.totalCredits.textContent = newTotalCredits
      .toFixed(1)
      .replace(/\.0$/, "");
    dom.totalWeighted.textContent = newTotalWeightedPoints.toFixed(2);

    // Auto-scroll to results on mobile
    if (window.innerWidth <= 880) {
      document
        .querySelector(".results-grid")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Show semester GPA info message
    const semesterGpa = currentWeightedPoints / currentCredits;
    addMessage(
      `Previous CGPA ${prevCgpa.toFixed(
        2
      )} with ${prevCredits} credits, this semester GPA ${semesterGpa.toFixed(
        2
      )} with ${currentCredits
        .toFixed(1)
        .replace(/\.0$/, "")} credits → updated CGPA ${updatedCgpa.toFixed(
        2
      )}.`,
      "info"
    );

    if (updatedCgpa >= GRADING_SYSTEM.minDegreeCgpa) {
      dom.eligibilityBadge.hidden = false;
      dom.eligibilityBadge.classList.add("ok");
      dom.eligibilityBadge.textContent =
        "Meets minimum CGPA requirement for degree";
    } else {
      dom.eligibilityBadge.hidden = false;
      dom.eligibilityBadge.classList.add("warn");
      dom.eligibilityBadge.textContent =
        "Below minimum CGPA 2.00 required for degree";
    }
  }
}

function addCourseRow() {
  const fragment = dom.rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector("tr");

  row.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;

    if (actionBtn.dataset.action === "remove") {
      row.remove();
      resetResultsDisplay();
      clearMessages();
    }
  });

  dom.tbody.appendChild(fragment);
}

function clearAllCourses() {
  dom.tbody.innerHTML = "";
  resetResultsDisplay();
  clearMessages();
}

function init() {
  updateModeText();
  addCourseRow();

  dom.modeSelect.addEventListener("change", () => {
    updateModeText();
    resetResultsDisplay();
    clearMessages();
  });

  dom.addRowBtn.addEventListener("click", () => {
    addCourseRow();
  });

  dom.calculateBtn.addEventListener("click", () => {
    computeGpaOrCgpa();
  });

  dom.clearAllBtn.addEventListener("click", () => {
    clearAllCourses();
    addCourseRow();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
