/*
 * Pelícanos Bros - interfaz de la tienda.
 * La tienda consume PBData y nunca accede directamente a localStorage.
 */
(() => {
  "use strict";

  const openButtons = document.querySelectorAll("[data-dialog-open]");
  const closeButtons = document.querySelectorAll("[data-dialog-close]");
  const authTabs = document.querySelectorAll("[data-auth-tab]");
  const authDialog = document.getElementById("auth-dialog");
  const authMessage = document.getElementById("auth-message");
  const loginForm = document.getElementById("customer-login-form");
  const registerForm = document.getElementById("customer-register-form");
  const authButton = document.getElementById("customer-auth-button");
  const logoutButton = document.getElementById("customer-logout-button");
  const ordersContainer = document.getElementById("customer-orders");

  const productGrid = document.getElementById("product-grid");
  const productResults = document.getElementById("product-results");
  const categoryButtons = document.querySelectorAll("[data-category]");
  const productDialog = document.getElementById("product-dialog");
  const customizationForm = document.getElementById("product-customization-form");
  const customizationFields = document.getElementById("customization-fields");
  const cartContent = document.getElementById("cart-content");
  const cartCount = document.getElementById("cart-count");
  const cartSubtotal = document.getElementById("cart-subtotal");
  const cartTotal = document.getElementById("cart-total");
  const checkoutButton = document.getElementById("checkout-button");
  const checkoutDialog = document.getElementById("checkout-dialog");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutMessage = document.getElementById("checkout-message");
  const checkoutSummary = document.getElementById("checkout-summary");
  const checkoutTotal = document.getElementById("checkout-total");
  const checkoutPhoneInput = document.getElementById("checkout-phone");
  const pickupTimeInput = document.getElementById("pickup-time");
  const checkoutSubmitButton = document.getElementById("checkout-submit-button");
  const checkoutReceipt = document.getElementById("checkout-receipt");
  const announcer = document.getElementById("app-announcer");

  let activeCategory = "todos";
  let activeCustomProduct = null;
  let checkoutSubmitting = false;

  const CATEGORY_LABELS = Object.freeze({
    pelicanos: "Pelícanos",
    bebidas: "Bebidas",
    extras: "Extras"
  });
  const CATEGORY_ICONS = Object.freeze({ pelicanos: "🍗", bebidas: "🥤", extras: "🍟" });
  const CURRENCY = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

  function money(value) {
    return CURRENCY.format(Number(value) || 0).replace("PEN", "S/").trim();
  }

  function setMessage(element, message, type = "error") {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-success", type === "success");
  }

  function announce(message) {
    if (announcer) announcer.textContent = message;
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function orderStatusLabel(status) {
    const labels = PBData.getPublicConfig().orderStatusLabels;
    return labels[status] || "Estado no disponible";
  }

  function orderStatusClass(status) {
    const allowed = ["pendiente", "en_preparacion", "listo", "entregado", "cancelado"];
    return allowed.includes(status) ? `order-status-${status}` : "order-status-unknown";
  }

  function formatOrderDate(value) {
    if (!value) return "No disponible";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No disponible";
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function customizationSummary(item) {
    if (!item.customizable || !item.customizations) return "";
    const groups = PBData.getPublicConfig().customizationGroups;
    return Object.entries(item.customizations).map(([key, value]) => {
      const label = groups[key]?.label || key;
      const choice = value === "normal" ? "Normal" : value === "sin" ? "Sin" : value === "extra" ? "Extra" : "No especificado";
      return `${label}: ${choice}`;
    }).join(" · ");
  }

  function createOrderItemsList(order) {
    const list = makeElement("ul", "customer-order-items");
    const items = Array.isArray(order.items)
      ? order.items.filter((item) => item && typeof item === "object")
      : [];

    if (items.length === 0) {
      list.append(makeElement("li", "customer-order-item-empty", "No hay detalle de productos disponible."));
      return list;
    }

    items.forEach((item) => {
      const row = makeElement("li", "customer-order-item");
      const info = makeElement("div", "customer-order-item-info");
      const quantityName = makeElement("strong", "customer-order-item-name", `${Number(item.quantity) || 0} × ${item.name || "Producto"}`);
      info.append(quantityName);

      const options = customizationSummary(item);
      if (options) info.append(makeElement("p", "customer-order-item-options", options));

      const lineTotal = makeElement("strong", "customer-order-item-total", money(item.lineTotal));
      row.append(info, lineTotal);
      list.append(row);
    });

    return list;
  }

  function createOrderEvents(order) {
    const details = makeElement("details", "customer-order-events");
    const events = Array.isArray(order.events)
      ? order.events.filter((item) => item && typeof item === "object")
      : [];
    events.sort((a, b) => (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0));

    const summary = makeElement("summary", "customer-order-events-summary", `Movimientos del pedido (${events.length})`);
    details.append(summary);

    if (events.length === 0) {
      details.append(makeElement("p", "customer-order-event-empty", "Todavía no hay movimientos registrados."));
      return details;
    }

    const list = makeElement("ol", "customer-order-event-list");
    events.forEach((eventItem) => {
      const row = makeElement("li", "customer-order-event");
      const description = makeElement("p", "customer-order-event-description", eventItem.description || "Actualización del pedido.");
      const date = makeElement("time", "customer-order-event-date", formatOrderDate(eventItem.createdAt));
      if (eventItem.createdAt) date.dateTime = eventItem.createdAt;
      row.append(description, date);
      list.append(row);
    });
    details.append(list);
    return details;
  }

  function createOrderCard(order) {
    const card = makeElement("article", "customer-order-card");
    const header = makeElement("div", "customer-order-card-header");
    const identity = makeElement("div", "customer-order-identity");
    identity.append(
      makeElement("span", "customer-order-kicker", "Código de pedido"),
      makeElement("h3", "customer-order-code", order.code || "Sin código")
    );

    const status = makeElement("span", `order-status-badge ${orderStatusClass(order.status)}`, orderStatusLabel(order.status));
    status.setAttribute("aria-label", `Estado del pedido: ${orderStatusLabel(order.status)}`);
    header.append(identity, status);
    card.append(header);

    if (order.status === "cancelado") {
      card.append(makeElement("p", "customer-order-cancelled", "Este pedido fue cancelado."));
    } else {
      const steps = [
        ["pendiente", "Recibido"],
        ["en_preparacion", "En preparación"],
        ["listo", "Listo"],
        ["entregado", "Entregado"]
      ];
      const currentIndex = steps.findIndex(([key]) => key === order.status);
      const progress = makeElement("ol", "customer-order-progress");
      progress.setAttribute("aria-label", "Progreso del pedido");
      steps.forEach(([key, label], index) => {
        const step = makeElement("li", "customer-order-progress-step", label);
        if (index < currentIndex) step.classList.add("is-complete");
        if (index === currentIndex) {
          step.classList.add("is-current");
          step.setAttribute("aria-current", "step");
        }
        progress.append(step);
      });
      card.append(progress);
    }

    const dates = makeElement("div", "customer-order-dates");
    const pickup = makeElement("div", "customer-order-date-cell");
    pickup.append(
      makeElement("span", "customer-order-label", "Fecha y hora de recojo"),
      makeElement("strong", "customer-order-date-value", formatOrderDate(order.pickupAt))
    );
    const created = makeElement("div", "customer-order-date-cell");
    created.append(
      makeElement("span", "customer-order-label", "Pedido realizado"),
      makeElement("strong", "customer-order-date-value", formatOrderDate(order.createdAt))
    );
    dates.append(pickup, created);
    card.append(dates);

    const itemSection = makeElement("section", "customer-order-products");
    itemSection.append(makeElement("h4", "customer-order-section-title", "Productos del pedido"));
    itemSection.append(createOrderItemsList(order));
    card.append(itemSection);

    const footer = makeElement("div", "customer-order-footer");
    const payment = makeElement("div", "customer-order-payment");
    payment.append(
      makeElement("span", "customer-order-label", `Método: ${paymentMethodLabel(order.paymentMethod)}`),
      makeElement("span", `payment-status-badge ${order.paymentStatus === "pagado" ? "is-paid" : "is-pending"}`,
        order.paymentStatus === "pagado" ? "Pago verificado" : "Pago pendiente de verificación")
    );
    const total = makeElement("div", "customer-order-total");
    total.append(
      makeElement("span", "customer-order-label", "Total del pedido"),
      makeElement("strong", "customer-order-total-value", money(order.total))
    );
    footer.append(payment, total);
    card.append(footer);

    if (order.note) {
      const note = makeElement("p", "customer-order-note");
      note.append(makeElement("strong", "", "Nota para cocina: "), document.createTextNode(order.note));
      card.append(note);
    }

    card.append(createOrderEvents(order));
    return card;
  }

  function renderCustomerState() {
    const customer = PBData.getCustomerSession();

    if (authButton) {
      authButton.textContent = customer ? `Hola, ${customer.name}` : "Iniciar sesión";
      authButton.setAttribute("aria-label", customer ? `Cuenta de ${customer.name}` : "Iniciar sesión");
    }
    if (logoutButton) logoutButton.hidden = !customer;
    if (!ordersContainer) return;

    ordersContainer.replaceChildren();

    if (!customer) {
      const empty = makeElement("div", "empty-state empty-state-horizontal");
      const textGroup = makeElement("div");
      textGroup.append(
        makeElement("h3", "", "Consulta tus pedidos"),
        makeElement("p", "", "Inicia sesión para consultar únicamente tu estado y tu historial de pedidos.")
      );
      const action = makeElement("button", "button button-outline", "Iniciar sesión");
      action.type = "button";
      action.addEventListener("click", () => {
        if (authDialog && !authDialog.open) authDialog.showModal();
      });
      empty.append(textGroup, action);
      ordersContainer.append(empty);
      return;
    }

    const ownOrders = PBData.getCustomerOrders();
    const toolbar = makeElement("div", "customer-orders-toolbar");
    const intro = makeElement("div", "customer-orders-intro");
    intro.append(
      makeElement("h3", "", `Hola, ${customer.name}`),
      makeElement("p", "muted", ownOrders.length === 0
        ? "Todavía no tienes pedidos registrados. Cuando confirmes una compra, aparecerá aquí."
        : `Tienes ${ownOrders.length} pedido(s) en tu historial.`)
    );
    const refreshButton = makeElement("button", "button button-outline customer-orders-refresh", "Actualizar historial");
    refreshButton.type = "button";
    refreshButton.addEventListener("click", () => {
      renderCustomerState();
      announce("Tu historial de pedidos se ha actualizado.");
    });
    toolbar.append(intro, refreshButton);
    ordersContainer.append(toolbar);

    if (ownOrders.length === 0) {
      const empty = makeElement("div", "empty-state customer-orders-empty");
      empty.append(
        makeElement("span", "empty-state-icon", "🧾"),
        makeElement("h3", "", "Aún no tienes pedidos"),
        makeElement("p", "", "Explora nuestro menú y confirma tu primer pedido. Aquí podrás seguir su preparación y consultar tus compras anteriores.")
      );
      const browse = makeElement("a", "button button-primary", "Explorar menú");
      browse.href = "#menu";
      empty.append(browse);
      ordersContainer.append(empty);
      return;
    }

    const list = makeElement("div", "customer-orders-list");
    ownOrders.forEach((order) => list.append(createOrderCard(order)));
    ordersContainer.append(list);
  }

  function createProductImage(product) {
    const frame = makeElement("div", "product-card-media");

    if (!product.image) {
      const fallback = makeElement("div", "product-image-placeholder");
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", `Fotografía pendiente para ${product.name}`);
      fallback.append(makeElement("span", "product-placeholder-icon", CATEGORY_ICONS[product.category] || "🍽️"));
      fallback.append(makeElement("span", "product-placeholder-text", "Fotografía referencial pendiente"));
      frame.append(fallback);
      return frame;
    }

    const image = document.createElement("img");
    image.alt = product.name || "Producto del menú";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      const fallback = makeElement("div", "product-image-placeholder");
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", `Imagen no disponible para ${product.name}`);
      fallback.append(makeElement("span", "product-placeholder-icon", CATEGORY_ICONS[product.category] || "🍽️"));
      fallback.append(makeElement("span", "product-placeholder-text", "Imagen no disponible"));
      frame.replaceChildren(fallback);
    }, { once: true });
    image.src = product.image;
    frame.append(image);
    return frame;
  }

  function createProductCard(product) {
    const card = makeElement("article", "product-card");
    const media = createProductImage(product);
    const body = makeElement("div", "product-card-body");
    const meta = makeElement("div", "product-card-meta");
    const category = makeElement("span", "product-category", CATEGORY_LABELS[product.category] || "Producto");
    const availability = makeElement(
      "span",
      product.available ? "availability-badge is-available" : "availability-badge is-unavailable",
      product.available ? "Disponible" : "Agotado"
    );
    meta.append(category, availability);

    const title = makeElement("h3", "product-card-title", product.name);
    const description = makeElement("p", "product-card-description", product.description || "Producto del menú de Pelícanos Bros.");
    const priceRow = makeElement("div", "product-card-price-row");
    priceRow.append(makeElement("span", "muted", "Precio base"), makeElement("strong", "product-card-price", money(product.price)));

    body.append(meta, title, description, priceRow);

    if (product.imageCredit && product.imageSource) {
      const credit = makeElement("p", "product-photo-credit");
      credit.append(document.createTextNode("Imagen referencial · "));
      const link = makeElement("a", "", product.imageCredit);
      link.href = product.imageSource;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Crédito y licencia de imagen para ${product.name}`);
      credit.append(link);
      body.append(credit);
    } else if (product.id === "prod-mixto" && !product.image) {
      body.append(makeElement("p", "product-photo-credit", "Fotografía específica pendiente de incorporar."));
    }

    const actions = makeElement("div", "product-card-actions");
    const button = makeElement("button", "button button-primary button-block", product.customizable ? "Personalizar y agregar" : "Agregar al carrito");
    button.type = "button";
    button.dataset.productAction = product.customizable ? "customize" : "add";
    button.dataset.productId = product.id;
    button.disabled = product.available !== true;
    if (!product.available) button.setAttribute("aria-label", `${product.name} está agotado`);
    actions.append(button);
    body.append(actions);

    card.append(media, body);
    return card;
  }

  function renderProducts() {
    if (!productGrid) return;
    const products = PBData.getProducts({ category: activeCategory });
    productGrid.replaceChildren();

    if (productResults) {
      const suffix = products.length === 1 ? "producto" : "productos";
      productResults.textContent = `${products.length} ${suffix} en ${activeCategory === "todos" ? "el menú" : CATEGORY_LABELS[activeCategory].toLowerCase()}.`;
    }

    if (products.length === 0) {
      const empty = makeElement("div", "empty-state");
      empty.append(
        makeElement("span", "empty-state-icon", "🍽️"),
        makeElement("h3", "", "No hay productos en esta categoría"),
        makeElement("p", "", "Prueba otra categoría o vuelve a consultar más tarde.")
      );
      productGrid.append(empty);
      return;
    }

    products.forEach((product) => productGrid.append(createProductCard(product)));
  }

  function getSelectedCustomizations() {
    const values = {};
    customizationFields?.querySelectorAll("select[data-customization]").forEach((select) => {
      values[select.dataset.customization] = select.value;
    });
    return values;
  }

  function renderCustomizationFields(product) {
    if (!customizationFields) return;
    customizationFields.replaceChildren();
    const groups = PBData.getPublicConfig().customizationGroups;

    Object.entries(groups).forEach(([key, group]) => {
      const field = makeElement("div", "form-field customization-field");
      const label = makeElement("label", "", group.label);
      const select = document.createElement("select");
      select.name = key;
      select.dataset.customization = key;
      select.id = `custom-${key}`;
      select.setAttribute("aria-label", `Personalización de ${group.label.toLowerCase()}`);

      ["normal", "sin", "extra"].forEach((value) => {
        const amount = Number(group[value] || 0);
        let detail = "Sin variación";
        if (amount < 0) detail = `− ${money(Math.abs(amount))}`;
        if (amount > 0) detail = `+ ${money(amount)}`;
        const option = makeElement("option", "", `${value === "normal" ? "Normal" : value === "sin" ? "Sin" : "Extra"} · ${detail}`);
        option.value = value;
        select.append(option);
      });

      select.value = "normal";
      select.disabled = product.customizable !== true;
      label.htmlFor = select.id;
      field.append(label, select);
      customizationFields.append(field);
    });
  }

  function calculateCustomizationPreview() {
    if (!activeCustomProduct || !customizationForm) return;
    const quantityInput = document.getElementById("custom-product-quantity");
    const quantity = Number(quantityInput?.value || 1);

    try {
      const line = PBData.calculateLine(activeCustomProduct, quantity, getSelectedCustomizations());
      document.getElementById("custom-base-price").textContent = money(line.baseUnitPrice);
      const adjustmentText = line.customizationAdjustment > 0
        ? `+ ${money(line.customizationAdjustment)}`
        : line.customizationAdjustment < 0
          ? `− ${money(Math.abs(line.customizationAdjustment))}`
          : money(0);
      document.getElementById("custom-adjustment").textContent = adjustmentText;
      document.getElementById("custom-unit-price").textContent = money(line.unitPrice);
      document.getElementById("custom-line-total").textContent = money(line.lineTotal);
      setMessage(document.getElementById("product-dialog-message"), "");
    } catch (error) {
      setMessage(document.getElementById("product-dialog-message"), error.message || "Revisa las opciones seleccionadas.");
    }
  }

  function openProductCustomization(product) {
    if (!productDialog || !customizationForm) return;
    if (!product.available) {
      announce(`${product.name} está agotado.`);
      return;
    }
    activeCustomProduct = product;
    document.getElementById("product-dialog-title").textContent = product.name;
    document.getElementById("product-dialog-description").textContent = product.description || "Elige cómo deseas tus acompañamientos.";
    document.getElementById("custom-product-id").value = product.id;
    document.getElementById("custom-product-quantity").value = "1";
    renderCustomizationFields(product);
    calculateCustomizationPreview();
    if (!productDialog.open) productDialog.showModal();
  }

  function createCartAction(action, item, text, label, disabled = false, className = "") {
    const button = makeElement("button", className, text);
    button.type = "button";
    button.dataset.cartAction = action;
    button.dataset.cartItemId = item.cartItemId;
    button.disabled = disabled;
    button.setAttribute("aria-label", label);
    return button;
  }

  function renderCart() {
    if (!cartContent) return;

    const cart = PBData.calculateCart();
    if (cartCount) {
      cartCount.textContent = String(cart.units);
      cartCount.setAttribute("aria-label", `${cart.units} ${cart.units === 1 ? "unidad" : "unidades"} en el carrito`);
    }
    if (cartSubtotal) cartSubtotal.textContent = money(cart.subtotal);
    if (cartTotal) cartTotal.textContent = money(cart.total);
    if (checkoutButton) checkoutButton.disabled = cart.items.length === 0 || cart.issues.length > 0;

    cartContent.replaceChildren();
    if (cart.items.length === 0) {
      cartContent.append(makeElement("p", "muted", "Todavía no agregaste productos."));
      if (cart.issues.length > 0) {
        cartContent.append(makeElement("p", "cart-warning", cart.issues.join(" ")));
      }
      return;
    }

    const list = makeElement("div", "cart-summary-list");
    const config = PBData.getPublicConfig();

    cart.items.forEach((item) => {
      const row = makeElement("article", "cart-summary-item");
      const media = makeElement("div", "cart-item-media");

      if (item.image) {
        const image = document.createElement("img");
        image.className = "cart-item-thumbnail";
        image.alt = item.name || "Producto del carrito";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => {
          media.replaceChildren(makeElement("span", "cart-item-placeholder", "🍽️"));
        }, { once: true });
        image.src = item.image;
        media.append(image);
      } else {
        media.append(makeElement("span", "cart-item-placeholder", "🍽️"));
      }

      const details = makeElement("div", "cart-summary-details");
      details.append(
        makeElement("strong", "cart-summary-name", item.name),
        makeElement("span", "cart-summary-unit-price", `${money(item.unitPrice)} por unidad`)
      );

      if (item.customizable && Object.keys(item.customizations).length > 0) {
        const choices = Object.entries(item.customizations)
          .map(([key, value]) => {
            const label = config.customizationGroups[key]?.label || key;
            const choice = value === "normal" ? "Normal" : value === "sin" ? "Sin" : "Extra";
            return `${label}: ${choice}`;
          })
          .join(" · ");
        details.append(makeElement("span", "cart-summary-options", choices));
      }

      const controls = makeElement("div", "cart-item-controls");
      const decrease = createCartAction(
        "decrease", item, "−", `Disminuir cantidad de ${item.name}`,
        item.quantity <= 1, "cart-quantity-button"
      );
      const quantity = makeElement("span", "cart-quantity-value", String(item.quantity));
      quantity.setAttribute("aria-live", "polite");
      const increase = createCartAction(
        "increase", item, "+", `Aumentar cantidad de ${item.name}`,
        item.quantity >= 99 || !item.available, "cart-quantity-button"
      );
      const remove = createCartAction(
        "remove", item, "Quitar", `Quitar ${item.name} del carrito`,
        false, "cart-remove-button"
      );
      controls.append(decrease, quantity, increase, remove);

      const side = makeElement("div", "cart-summary-side");
      side.append(makeElement("strong", "cart-summary-total", money(item.lineTotal)), controls);
      if (!item.available) {
        details.append(makeElement("span", "cart-item-unavailable", "No disponible · quita este artículo"));
      }

      row.append(media, details, side);
      list.append(row);
    });

    cartContent.append(list);
    if (cart.issues.length > 0) {
      cartContent.append(makeElement("p", "cart-warning", cart.issues.join(" ")));
    }
  }

  function localDateTimeValue(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  function roundUpToNextMinute(date) {
    const rounded = new Date(date);
    rounded.setSeconds(0, 0);
    rounded.setMinutes(rounded.getMinutes() + 1);
    return rounded;
  }

  function getPickupMinimumValue() {
    const earliest = roundUpToNextMinute(new Date(Date.now() + 10 * 60 * 1000));
    return localDateTimeValue(earliest);
  }

  function getPickupDefaultValue() {
    const suggested = roundUpToNextMinute(new Date(Date.now() + 15 * 60 * 1000));
    return localDateTimeValue(suggested);
  }

  function formatPickupDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function paymentMethodLabel(value) {
    const labels = {
      efectivo: "Efectivo",
      yape: "Yape",
      plin: "Plin",
      transferencia: "Transferencia"
    };
    return labels[value] || "No especificado";
  }

  function renderCheckoutSummary() {
    if (!checkoutSummary) return;
    const cart = PBData.calculateCart();
    checkoutSummary.replaceChildren();

    if (cart.items.length === 0) {
      checkoutSummary.append(makeElement("p", "muted", "El carrito está vacío."));
    } else {
      cart.items.forEach((item) => {
        const row = makeElement("div", "checkout-summary-line");
        const details = makeElement("div", "checkout-summary-details");
        details.append(
          makeElement("strong", "checkout-summary-name", item.name),
          makeElement("span", "checkout-summary-quantity", `${item.quantity} × ${money(item.unitPrice)}`)
        );

        if (item.customizable && Object.keys(item.customizations).length > 0) {
          const config = PBData.getPublicConfig();
          const choices = Object.entries(item.customizations).map(([key, value]) => {
            const label = config.customizationGroups[key]?.label || key;
            const choice = value === "normal" ? "Normal" : value === "sin" ? "Sin" : "Extra";
            return `${label}: ${choice}`;
          }).join(" · ");
          details.append(makeElement("span", "checkout-summary-options", choices));
        }

        row.append(details, makeElement("strong", "checkout-summary-line-total", money(item.lineTotal)));
        checkoutSummary.append(row);
      });
    }

    if (checkoutTotal) checkoutTotal.textContent = money(cart.total);
    if (checkoutSubmitButton) {
      checkoutSubmitButton.disabled = cart.items.length === 0 || cart.issues.length > 0;
    }
    if (cart.issues.length > 0) {
      checkoutSummary.append(makeElement("p", "cart-warning", cart.issues.join(" ")));
    }
  }

  function prepareCheckout() {
    const customer = PBData.getCustomerSession();
    const cart = PBData.calculateCart();

    if (!customer) {
      if (authDialog && !authDialog.open) authDialog.showModal();
      setMessage(authMessage, "Inicia sesión para continuar con tu pedido.");
      return false;
    }

    if (cart.items.length === 0 || cart.issues.length > 0) {
      setMessage(checkoutMessage, cart.issues.join(" ") || "Agrega productos al carrito antes de continuar.");
      renderCart();
      return false;
    }

    if (checkoutForm) checkoutForm.hidden = false;
    if (checkoutReceipt) checkoutReceipt.hidden = true;
    if (checkoutMessage) setMessage(checkoutMessage, "");

    if (pickupTimeInput) {
      pickupTimeInput.min = getPickupMinimumValue();
      pickupTimeInput.value = getPickupDefaultValue();
    }
    if (checkoutPhoneInput) checkoutPhoneInput.value = customer.phone || "";
    renderCheckoutSummary();
    return true;
  }

  function showOrderReceipt(order) {
    if (checkoutForm) checkoutForm.hidden = true;
    if (checkoutReceipt) checkoutReceipt.hidden = false;

    const labels = PBData.getPublicConfig().orderStatusLabels;
    const status = document.getElementById("confirmed-order-status");
    const pickup = document.getElementById("confirmed-order-pickup");
    const total = document.getElementById("confirmed-order-total");
    const paymentMethod = document.getElementById("confirmed-order-payment-method");
    const paymentStatus = document.getElementById("confirmed-order-payment-status");
    const code = document.getElementById("confirmed-order-code");

    if (code) code.textContent = order.code;
    if (status) status.textContent = labels[order.status] || "Recibido";
    if (pickup) pickup.textContent = formatPickupDate(order.pickupAt);
    if (total) total.textContent = money(order.total);
    if (paymentMethod) paymentMethod.textContent = paymentMethodLabel(order.paymentMethod);
    if (paymentStatus) paymentStatus.textContent = order.paymentStatus === "pagado" ? "Pagado" : "Pendiente de verificación";

    setMessage(checkoutMessage, `Tu pedido ${order.code} se registró correctamente.`, "success");
    announce(`Pedido ${order.code} registrado. Total ${money(order.total)}. El pago está pendiente de verificación.`);
  }

  function addSimpleProduct(product) {
    try {
      PBData.addCartItem(product.id, 1, {});
      renderCart();
      announce(`${product.name} se agregó al carrito.`);
    } catch (error) {
      announce(error.message || "No se pudo agregar el producto.");
    }
  }

  if (cartContent) {
    cartContent.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-cart-action]");
      if (!button || button.disabled) return;

      const action = button.dataset.cartAction;
      const itemId = button.dataset.cartItemId;
      const storedItem = PBData.getCart().items.find((item) => item.id === itemId);
      if (!storedItem) {
        renderCart();
        announce("El artículo ya no está en el carrito.");
        return;
      }

      try {
        if (action === "remove") {
          PBData.removeCartItem(itemId);
          renderCart();
          announce("Producto eliminado del carrito.");
          return;
        }

        if (action === "increase") {
          PBData.updateCartQuantity(itemId, Number(storedItem.quantity) + 1);
          renderCart();
          announce("Cantidad aumentada.");
          return;
        }

        if (action === "decrease") {
          if (Number(storedItem.quantity) <= 1) return;
          PBData.updateCartQuantity(itemId, Number(storedItem.quantity) - 1);
          renderCart();
          announce("Cantidad disminuida.");
        }
      } catch (error) {
        announce(error.message || "No se pudo actualizar el carrito.");
      }
    });
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dialogId = button.dataset.dialogOpen;
      const dialog = document.getElementById(dialogId);
      if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
    });
  });

  function activateAuthTab(button, moveFocus = false) {
    const selectedTab = button.dataset.authTab;
    authTabs.forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    document.querySelectorAll("[role='tabpanel']").forEach((panel) => {
      panel.hidden = panel.id !== `${selectedTab}-panel`;
    });
    setMessage(authMessage, "");
    if (moveFocus) button.focus();
  }

  authTabs.forEach((button) => {
    button.addEventListener("click", () => activateAuthTab(button));
    button.addEventListener("keydown", (event) => {
      const tabs = [...authTabs];
      const currentIndex = tabs.indexOf(button);
      let nextIndex = currentIndex;

      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      activateAuthTab(tabs[nextIndex], true);
    });
  });

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category || "todos";
      categoryButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      renderProducts();
    });
  });

  if (productGrid) {
    productGrid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-product-action]");
      if (!button || button.disabled) return;
      const product = PBData.getProductById(button.dataset.productId);
      if (!product) return;

      if (button.dataset.productAction === "customize") openProductCustomization(product);
      else addSimpleProduct(product);
    });
  }

  if (customizationForm) {
    customizationForm.addEventListener("change", calculateCustomizationPreview);
    customizationForm.addEventListener("input", (event) => {
      if (event.target.id === "custom-product-quantity") calculateCustomizationPreview();
    });
    customizationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!activeCustomProduct) return;

      const quantity = Number(document.getElementById("custom-product-quantity").value);
      try {
        PBData.addCartItem(activeCustomProduct.id, quantity, getSelectedCustomizations());
        renderCart();
        productDialog.close();
        announce(`${activeCustomProduct.name} se agregó al carrito.`);
        activeCustomProduct = null;
      } catch (error) {
        setMessage(document.getElementById("product-dialog-message"), error.message || "No se pudo agregar el producto.");
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage(authMessage, "Verificando tus datos…");

      const formData = new FormData(loginForm);
      try {
        const customer = await PBData.authenticateCustomer({
          identifier: formData.get("identifier"),
          password: formData.get("password")
        });
        PBData.setCustomerSession(customer.id);
        loginForm.reset();
        renderCustomerState();
        renderCart();
        setMessage(authMessage, `Bienvenido, ${customer.name}. Has iniciado sesión.`, "success");
      } catch (error) {
        setMessage(authMessage, error.message || "No se pudo iniciar sesión.");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage(authMessage, "Creando tu cuenta…");

      const formData = new FormData(registerForm);
      try {
        const customer = await PBData.createCustomer({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password")
        });
        PBData.setCustomerSession(customer.id);
        registerForm.reset();
        renderCustomerState();
        renderCart();
        setMessage(authMessage, `Cuenta creada correctamente. ¡Bienvenido, ${customer.name}!`, "success");
      } catch (error) {
        setMessage(authMessage, error.message || "No se pudo crear la cuenta.");
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      PBData.clearCustomerSession();
      renderCustomerState();
      renderCart();
      setMessage(authMessage, "Has cerrado tu sesión.", "success");
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (checkoutSubmitting) return;

      const customer = PBData.getCustomerSession();
      if (!customer) {
        setMessage(checkoutMessage, "Tu sesión no está activa. Inicia sesión nuevamente.");
        return;
      }

      const formData = new FormData(checkoutForm);
      checkoutSubmitting = true;
      if (checkoutSubmitButton) checkoutSubmitButton.disabled = true;
      setMessage(checkoutMessage, "Registrando tu pedido…", "success");

      try {
        const order = PBData.createOrder({
          userId: customer.id,
          pickupAt: formData.get("pickupTime"),
          phone: formData.get("phone"),
          paymentMethod: formData.get("paymentMethod"),
          note: formData.get("note")
        });

        renderCart();
        renderCustomerState();
        showOrderReceipt(order);
      } catch (error) {
        setMessage(checkoutMessage, error.message || "No se pudo registrar el pedido.");
        if (error.code === "PICKUP_TOO_SOON" && pickupTimeInput) {
          pickupTimeInput.min = getPickupMinimumValue();
        }
        if (checkoutSubmitButton) checkoutSubmitButton.disabled = false;
      } finally {
        checkoutSubmitting = false;
        if (checkoutSubmitButton && !checkoutReceipt?.hidden) checkoutSubmitButton.disabled = false;
      }
    });
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
      if (!prepareCheckout()) return;
      if (checkoutDialog && !checkoutDialog.open) checkoutDialog.showModal();
    });
  }

  if (checkoutDialog) {
    checkoutDialog.addEventListener("close", () => {
      checkoutSubmitting = false;
      if (checkoutForm) {
        checkoutForm.reset();
        checkoutForm.hidden = false;
      }
      if (checkoutReceipt) checkoutReceipt.hidden = true;
      if (checkoutMessage) setMessage(checkoutMessage, "");
      if (checkoutSubmitButton) checkoutSubmitButton.disabled = false;
    });
  }

  // Sincronización entre pestañas del mismo navegador/origen.
  // Un cambio de catálogo desde administración actualiza menú y carrito;
  // un cambio de pedido o sesión actualiza el historial del cliente.
  window.addEventListener("storage", (event) => {
    if (event.key === null) {
      renderProducts();
      renderCart();
      renderCustomerState();
      return;
    }
    if (event.key === PBData.STORAGE_KEYS.products) {
      renderProducts();
      renderCart();
    }
    if ([PBData.STORAGE_KEYS.orders, PBData.STORAGE_KEYS.customerSession].includes(event.key)) {
      renderCustomerState();
    }
    if (event.key === PBData.STORAGE_KEYS.cart) renderCart();
  });
  window.addEventListener("focus", () => {
    renderCustomerState();
    renderProducts();
    renderCart();
  });

  renderCustomerState();
  renderProducts();
  renderCart();
})();
