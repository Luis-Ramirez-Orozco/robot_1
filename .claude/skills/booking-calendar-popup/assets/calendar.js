// Vanilla port of a "Calendar" React component, single-date mode only: a
// popup booking calendar triggered by any "#book-now-link" on the page, with
// an "Add-ons" popup and an "Inquire" flow (phone number -> mailto -> thanks)
// opened from within it.
// Self-contained: builds its own modal markup, so pages only need to link
// calendar.css + calendar.js, no shared HTML to keep in sync.
(function () {
  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  var WEEKDAY_PRICE = 450;
  var WEEKEND_PRICE = 499;

  // Where "Inquire" sends the booking details.
  var OWNER_EMAIL = "contactramirezl@gmail.com";

  // Add-ons offered at booking.
  var ADDONS = [
    { id: "co2-cannon", label: "CO2 Cannon", price: 100, img: "images/addons/web/co2-cannon.jpg" },
    { id: "balloons", label: "Balloons", price: 25, img: "images/addons/web/balloons.jpg" },
    { id: "led-noodles", label: "LED Noodles", price: 25, img: "images/addons/web/led-noodle.jpg" },
    { id: "money-shooter", label: "Money Shooter", price: 25, img: "images/addons/web/money-shooter.jpg" },
    { id: "extra-robot", label: "Extra Robot", price: 300, img: "images/Gallery/web/IMG_0019.jpg" }
  ];

  function priceFor(date) {
    var day = date.getDay();
    return (day === 0 || day === 6) ? WEEKEND_PRICE : WEEKDAY_PRICE;
  }

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function isSameDay(a, b) {
    return !!a && !!b && a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function isSameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

  function buildMonthGrid(month) {
    var firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    var gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
    var days = [];
    for (var i = 0; i < 42; i++) {
      var d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function buildCalendarModal() {
    var overlay = document.createElement("div");
    overlay.id = "calendar-overlay";
    overlay.className = "calendar-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="calendar-title">Book a Date</h2>' +
      '    <button type="button" class="calendar-close" id="calendar-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <div class="calendar-nav">' +
      '    <button type="button" class="calendar-nav-btn" id="calendar-prev" aria-label="Previous month">' +
      '      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' +
      "    </button>" +
      '    <span class="calendar-month-label" id="calendar-month-label" aria-live="polite"></span>' +
      '    <button type="button" class="calendar-nav-btn" id="calendar-next" aria-label="Next month">' +
      '      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>' +
      "    </button>" +
      "  </div>" +
      '  <div class="calendar-weekdays" id="calendar-weekdays"></div>' +
      '  <div class="calendar-grid" id="calendar-grid" role="grid"></div>' +
      '  <div class="calendar-footer">' +
      '    <button type="button" class="calendar-addons-btn" id="calendar-addons-btn">Add-ons</button>' +
      '    <button type="button" class="calendar-confirm-btn" id="calendar-inquire-btn" disabled>Inquire</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function buildAddonsModal() {
    var overlay = document.createElement("div");
    overlay.id = "addons-overlay";
    overlay.className = "calendar-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var rows = ADDONS.map(function (addon) {
      return (
        '<label class="addon-card">' +
        '  <input type="checkbox" class="addons-checkbox" data-id="' + addon.id + '" />' +
        '  <img class="addon-card-img" src="' + addon.img + '" alt="" loading="lazy" />' +
        '  <span class="addon-card-body">' +
        '    <span class="addon-card-label">' + addon.label + "</span>" +
        '    <span class="addon-card-price">$' + addon.price + "</span>" +
        "  </span>" +
        "</label>"
      );
    }).join("");

    overlay.innerHTML =
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="addons-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="addons-title">Add-ons</h2>' +
      '    <button type="button" class="calendar-close" id="addons-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <div class="addons-list" id="addons-list">' + rows + "</div>" +
      '  <div class="calendar-footer">' +
      '    <span id="addons-total-label">No add-ons selected</span>' +
      '    <button type="button" class="calendar-confirm-btn" id="addons-done">Done</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function buildPhoneModal() {
    var overlay = document.createElement("div");
    overlay.id = "phone-overlay";
    overlay.className = "calendar-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="phone-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="phone-title">Your Phone Number</h2>' +
      '    <button type="button" class="calendar-close" id="phone-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <p class="phone-helper">So we can reach out and confirm the details with you.</p>' +
      '  <input type="tel" id="phone-input" class="phone-input" placeholder="(555) 123-4567" autocomplete="tel" />' +
      '  <div class="calendar-footer">' +
      '    <span id="phone-error" class="phone-error"></span>' +
      '    <button type="button" class="calendar-confirm-btn" id="phone-send">Send</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function buildThankYouModal() {
    var overlay = document.createElement("div");
    overlay.id = "thankyou-overlay";
    overlay.className = "calendar-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="thankyou-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="thankyou-title">Thank You!</h2>' +
      '    <button type="button" class="calendar-close" id="thankyou-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <p class="thankyou-message">Thank you for your inquiry. Please wait up to 24 hours for a response.</p>' +
      '  <div class="calendar-footer thankyou-footer">' +
      '    <button type="button" class="calendar-confirm-btn" id="thankyou-ok">Close</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function init() {
    var bookNowLinks = document.querySelectorAll("#book-now-link");
    if (!bookNowLinks.length) return;

    var overlay = buildCalendarModal();
    var monthLabel = overlay.querySelector("#calendar-month-label");
    var weekdaysEl = overlay.querySelector("#calendar-weekdays");
    var gridEl = overlay.querySelector("#calendar-grid");
    var prevBtn = overlay.querySelector("#calendar-prev");
    var nextBtn = overlay.querySelector("#calendar-next");
    var closeBtn = overlay.querySelector("#calendar-close");
    var inquireBtn = overlay.querySelector("#calendar-inquire-btn");
    var addonsBtn = overlay.querySelector("#calendar-addons-btn");

    var addonsOverlay = buildAddonsModal();
    var addonsList = addonsOverlay.querySelector("#addons-list");
    var addonsClose = addonsOverlay.querySelector("#addons-close");
    var addonsDone = addonsOverlay.querySelector("#addons-done");
    var addonsTotalLabel = addonsOverlay.querySelector("#addons-total-label");
    var addonsCheckboxes = Array.prototype.slice.call(addonsList.querySelectorAll(".addons-checkbox"));

    var phoneOverlay = buildPhoneModal();
    var phoneClose = phoneOverlay.querySelector("#phone-close");
    var phoneInput = phoneOverlay.querySelector("#phone-input");
    var phoneError = phoneOverlay.querySelector("#phone-error");
    var phoneSend = phoneOverlay.querySelector("#phone-send");

    var thankYouOverlay = buildThankYouModal();
    var thankYouClose = thankYouOverlay.querySelector("#thankyou-close");
    var thankYouOk = thankYouOverlay.querySelector("#thankyou-ok");

    var today = startOfDay(new Date());
    var displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var selectedDate = null;
    var selectedAddons = {};
    var lastFocused = null;
    var addonsLastFocused = null;
    var phoneLastFocused = null;
    var thankYouLastFocused = null;

    WEEKDAYS.forEach(function (label) {
      var span = document.createElement("span");
      span.textContent = label;
      weekdaysEl.appendChild(span);
    });

    function render() {
      monthLabel.textContent = MONTH_NAMES[displayedMonth.getMonth()] + " " + displayedMonth.getFullYear();
      gridEl.innerHTML = "";
      buildMonthGrid(displayedMonth).forEach(function (date) {
        var price = priceFor(date);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-day";
        btn.innerHTML =
          '<span class="calendar-day-number">' + date.getDate() + "</span>" +
          '<span class="calendar-day-price">$' + price + "</span>";
        btn.setAttribute("aria-label", date.toDateString() + ", $" + price);

        if (!isSameMonth(date, displayedMonth)) btn.classList.add("is-outside");
        if (isSameDay(date, today)) btn.classList.add("is-today");
        if (isSameDay(date, selectedDate)) {
          btn.classList.add("is-selected");
          btn.setAttribute("aria-selected", "true");
        }
        if (date.getTime() < today.getTime()) {
          btn.disabled = true;
        } else {
          btn.addEventListener("click", function () {
            selectedDate = date;
            render();
          });
        }
        gridEl.appendChild(btn);
      });

      inquireBtn.disabled = !selectedDate;
    }

    function addonsTotal() {
      return ADDONS.reduce(function (sum, addon) {
        return sum + (selectedAddons[addon.id] ? addon.price : 0);
      }, 0);
    }

    function renderAddonsButton() {
      var count = Object.keys(selectedAddons).filter(function (id) { return selectedAddons[id]; }).length;
      addonsBtn.textContent = count ? "Add-ons · $" + addonsTotal() : "Add-ons";
    }

    function renderAddonsTotal() {
      var total = addonsTotal();
      addonsTotalLabel.textContent = total ? ("$" + total + " in add-ons selected") : "No add-ons selected";
    }

    function resetBooking() {
      selectedDate = null;
      selectedAddons = {};
      addonsCheckboxes.forEach(function (checkbox) { checkbox.checked = false; });
      renderAddonsButton();
      renderAddonsTotal();
      phoneInput.value = "";
      phoneError.textContent = "";
    }

    function topOpenOverlay() {
      if (thankYouOverlay.classList.contains("is-open")) return thankYouOverlay;
      if (phoneOverlay.classList.contains("is-open")) return phoneOverlay;
      if (addonsOverlay.classList.contains("is-open")) return addonsOverlay;
      if (overlay.classList.contains("is-open")) return overlay;
      return null;
    }

    function onGlobalKeydown(e) {
      if (e.key !== "Escape") return;
      var top = topOpenOverlay();
      if (top === thankYouOverlay) closeThankYou();
      else if (top === phoneOverlay) closePhone();
      else if (top === addonsOverlay) closeAddons();
      else if (top === overlay) closeCalendar();
    }

    function openCalendar() {
      lastFocused = document.activeElement;
      displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      render();
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    function closeCalendar() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function openAddons() {
      addonsLastFocused = document.activeElement;
      renderAddonsTotal();
      addonsOverlay.classList.add("is-open");
      addonsOverlay.setAttribute("aria-hidden", "false");
      addonsClose.focus();
    }

    function closeAddons() {
      addonsOverlay.classList.remove("is-open");
      addonsOverlay.setAttribute("aria-hidden", "true");
      renderAddonsButton();
      if (addonsLastFocused && addonsLastFocused.focus) addonsLastFocused.focus();
    }

    function openPhone() {
      phoneLastFocused = document.activeElement;
      phoneError.textContent = "";
      phoneOverlay.classList.add("is-open");
      phoneOverlay.setAttribute("aria-hidden", "false");
      phoneInput.focus();
    }

    function closePhone() {
      phoneOverlay.classList.remove("is-open");
      phoneOverlay.setAttribute("aria-hidden", "true");
      if (phoneLastFocused && phoneLastFocused.focus) phoneLastFocused.focus();
    }

    function openThankYou() {
      thankYouLastFocused = document.activeElement;
      thankYouOverlay.classList.add("is-open");
      thankYouOverlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      thankYouOk.focus();
    }

    function closeThankYou() {
      thankYouOverlay.classList.remove("is-open");
      thankYouOverlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (thankYouLastFocused && thankYouLastFocused.focus) thankYouLastFocused.focus();
    }

    function buildMailto(phone) {
      var subject = "New Booking Inquiry" +
        (selectedDate ? " — " + selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");

      var lines = [];
      lines.push("Requested date: " + (selectedDate
        ? selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : "Not selected"));
      if (selectedDate) lines.push("Date price: $" + priceFor(selectedDate));

      var chosenAddons = ADDONS.filter(function (a) { return selectedAddons[a.id]; });
      if (chosenAddons.length) {
        lines.push("");
        lines.push("Add-ons:");
        chosenAddons.forEach(function (a) { lines.push("- " + a.label + " ($" + a.price + ")"); });
        lines.push("Add-ons total: $" + addonsTotal());
      }

      var grandTotal = (selectedDate ? priceFor(selectedDate) : 0) + addonsTotal();
      lines.push("");
      lines.push("Estimated total: $" + grandTotal);
      lines.push("");
      lines.push("Customer phone: " + phone);

      return "mailto:" + OWNER_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
    }

    document.addEventListener("keydown", onGlobalKeydown);

    bookNowLinks.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        openCalendar();
      });
    });

    prevBtn.addEventListener("click", function () {
      displayedMonth = addMonths(displayedMonth, -1);
      render();
    });
    nextBtn.addEventListener("click", function () {
      displayedMonth = addMonths(displayedMonth, 1);
      render();
    });
    closeBtn.addEventListener("click", closeCalendar);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeCalendar();
    });
    inquireBtn.addEventListener("click", openPhone);

    addonsBtn.addEventListener("click", openAddons);
    addonsClose.addEventListener("click", closeAddons);
    addonsDone.addEventListener("click", closeAddons);
    addonsOverlay.addEventListener("click", function (e) {
      if (e.target === addonsOverlay) closeAddons();
    });
    addonsCheckboxes.forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        selectedAddons[checkbox.dataset.id] = checkbox.checked;
        renderAddonsTotal();
      });
    });

    phoneClose.addEventListener("click", closePhone);
    phoneOverlay.addEventListener("click", function (e) {
      if (e.target === phoneOverlay) closePhone();
    });
    phoneInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") phoneSend.click();
    });
    phoneSend.addEventListener("click", function () {
      var digits = phoneInput.value.replace(/\D/g, "");
      if (digits.length < 7) {
        phoneError.textContent = "Please enter a valid phone number.";
        phoneInput.focus();
        return;
      }
      window.location.href = buildMailto(phoneInput.value.trim());
      closePhone();
      closeCalendar();
      openThankYou();
      resetBooking();
    });

    thankYouClose.addEventListener("click", closeThankYou);
    thankYouOk.addEventListener("click", closeThankYou);
    thankYouOverlay.addEventListener("click", function (e) {
      if (e.target === thankYouOverlay) closeThankYou();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
