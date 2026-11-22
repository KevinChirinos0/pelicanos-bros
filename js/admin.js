/*
 * Pelícanos Bros - panel administrativo.
 * RF-09: verificación manual de pagos.
 * RF-10: cambios controlados del estado del pedido.
 * RF-11: tablero de cocina ordenado por hora de recojo.
 * RF-12: resumen e historial completo de clientes.
 * RF-13: edición del precio base y disponibilidad del menú.
 * RF-14: exportación CSV de los pedidos que coinciden con los filtros activos.
 * RF-15: impresión de comanda de cocina por pedido.
 * El control local es demostrativo; no sustituye la autorización del servidor.
 */
(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const accessSection = byId("admin-access");
  const dashboard = byId("admin-dashboard");
  const loginForm = byId("admin-login-form");
  const loginMessage = byId("admin-login-message");
  const logoutButton = byId("admin-logout-button");
  const sessionName = byId("admin-session-name");
  const navButtons = [...document.querySelectorAll("[data-panel]")];
  const panels = [...document.querySelectorAll(".admin-panel")];

  const ordersBody = byId("orders-table-body");
  const ordersMessage = byId("admin-orders-message");
  const searchInput = byId("order-search");
  const statusFilter = byId("order-status-filter");
  const paymentFilter = byId("order-payment-filter");
  const dateFilter = byId("order-date-filter");
  const refreshButton = byId("orders-refresh-button");
  const exportCsvButton = byId("orders-export-csv");

  const kitchenMessage = byId("kitchen-message");
  const kitchenRefreshButton = byId("kitchen-refresh-button");
  const kitchenColumns = {
    pendiente: { container: byId("kitchen-received"), count: byId("kitchen-received-count"), next: "en_preparacion", action: "Pasar a preparación" },
    en_preparacion: { container: byId("kitchen-preparing"), count: byId("kitchen-preparing-count"), next: "listo", action: "Marcar listo" },
    listo: { container: byId("kitchen-ready"), count: byId("kitchen-ready-count"), next: "entregado", action: "Marcar entregado" }
  };

  const customersBody = byId("customers-table-body");
  const customersMessage = byId("admin-customers-message");
  const customerSearch = byId("customer-search");
  const customersRefreshButton = byId("customers-refresh-button");
  const customerHistoryDialog = byId("customer-history-dialog");
  const customerHistoryTitle = byId("customer-history-title");
  const customerHistorySubtitle = byId("customer-history-subtitle");
  const customerHistoryContent = byId("customer-history-content");
  const customerHistoryClose = byId("customer-history-close");

  const productForm = byId("product-form");
  const productSelect = byId("product-select");
  const productPrice = byId("product-price");
  const productAvailability = byId("product-availability");
  const productCurrentName = byId("product-current-name");
  const productCurrentCategory = byId("product-current-category");
  const productCancelEdit = byId("product-cancel-edit");
  const productsBody = byId("products-table-body");
  const menuMessage = byId("admin-menu-message");
  const restoreMenuButton = byId("restore-menu-button");

  const config = PBData.getPublicConfig();
  const STATUS_LABELS = config.orderStatusLabels;
  const TRANSITIONS = config.orderTransitions;
  const PAYMENT_LABELS = { pendiente: "Pendiente", pagado: "Pagado" };
  const PAYMENT_METHOD_LABELS = {
    efectivo: "Efectivo", yape: "Yape", plin: "Plin", transferencia: "Transferencia"
  };
  const CATEGORY_LABELS = { pelicanos: "Pelícanos", bebidas: "Bebidas", extras: "Extras" };
  const CURRENCY = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
  const DATE_TIME = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" });

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== "") node.textContent = String(text);
    return node;
  }

  function setMessage(target, message, type = "info") {
    if (!target) return;
    target.textContent = message;
    target.classList.toggle("is-error", type === "error");
    target.classList.toggle("is-success", type === "success");
  }

  function hasAdminSession(messageTarget) {
    if (PBData.getAdminSession()) return true;
    setMessage(messageTarget, "La sesión administrativa no está activa. Vuelve a iniciar sesión.", "error");
    return false;
  }

  function formatMoney(value) {
    const amount = Number(value);
    return CURRENCY.format(Number.isFinite(amount) ? amount : 0);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Fecha no disponible" : DATE_TIME.format(date);
  }

  function localDateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function paymentMethodLabel(value) {
    return PAYMENT_METHOD_LABELS[value] || "No especificado";
  }

  function setActivePanel(button) {
    const targetId = `panel-${button.dataset.panel}`;
    const targetPanel = byId(targetId);
    if (!targetPanel) return;

    panels.forEach((panel) => { panel.hidden = panel !== targetPanel; });
    navButtons.forEach((navButton) => {
      const selected = navButton === button;
      navButton.classList.toggle("is-active", selected);
      navButton.removeAttribute("aria-current");
      if (selected) navButton.setAttribute("aria-current", "page");
    });

    renderActivePanel(button.dataset.panel);
  }

  function renderActivePanel(panelName) {
    if (panelName === "summary") renderSummary();
    if (panelName === "orders") renderOrders();
    if (panelName === "kitchen") renderKitchen();
    if (panelName === "customers") renderCustomers();
    if (panelName === "menu") renderProducts();
  }

  function showDashboard(admin) {
    if (accessSection) accessSection.hidden = true;
    if (dashboard) dashboard.hidden = false;
    if (logoutButton) logoutButton.hidden = false;
    if (sessionName) {
      sessionName.textContent = `Sesión: ${admin.username || admin.name}`;
      sessionName.hidden = false;
    }
    const activeButton = navButtons.find((button) => button.classList.contains("is-active")) || navButtons[0];
    if (activeButton) setActivePanel(activeButton);
    renderSummary();
  }

  function showLogin() {
    if (accessSection) accessSection.hidden = false;
    if (dashboard) dashboard.hidden = true;
    if (logoutButton) logoutButton.hidden = true;
    if (sessionName) sessionName.hidden = true;
    if (loginForm) loginForm.reset();
    [ordersBody, ...Object.values(kitchenColumns).map((item) => item.container), customersBody, productsBody].forEach((node) => node?.replaceChildren());
    setMessage(ordersMessage, "");
    setMessage(kitchenMessage, "");
    setMessage(customersMessage, "");
    setMessage(menuMessage, "");
    if (customerHistoryDialog?.open) customerHistoryDialog.close();
  }

  function getOrderFilters() {
    return {
      search: searchInput?.value || "",
      status: statusFilter?.value || "todos",
      paymentStatus: paymentFilter?.value || "todos",
      date: dateFilter?.value || ""
    };
  }

  function makeStatusBadge(status) {
    const label = STATUS_LABELS[status] || status || "Desconocido";
    return element("span", `order-status-badge order-status-${status || "unknown"}`, label);
  }

  function makePaymentBadge(status) {
    const label = PAYMENT_LABELS[status] || "Desconocido";
    const modifier = status === "pagado" ? "is-paid" : "is-pending";
    return element("span", `payment-status-badge ${modifier}`, label);
  }

  function makeCell(text = "") { return element("td", "", text); }

  function makePaymentCell(order) {
    const cell = element("td", "admin-payment-cell");
    cell.append(element("span", "admin-cell-primary", paymentMethodLabel(order.paymentMethod)), makePaymentBadge(order.paymentStatus));
    return cell;
  }

  function makeCustomerCell(order) {
    const cell = element("td", "admin-customer-cell");
    cell.append(
      element("strong", "admin-cell-primary", order.customer?.name || "Cliente sin nombre"),
      element("span", "admin-cell-secondary", order.customer?.email || "Sin correo"),
      element("span", "admin-cell-secondary", order.phone || order.customer?.phone || "Sin teléfono")
    );
    return cell;
  }

  function makePickupCell(order) {
    const cell = element("td", "admin-pickup-cell");
    cell.append(element("span", "admin-cell-primary", formatDate(order.pickupAt)), element("span", "admin-cell-secondary", `Creado: ${formatDate(order.createdAt)}`));
    return cell;
  }

  function makeActionsCell(order) {
    const cell = element("td", "admin-order-actions-cell");
    const wrapper = element("div", "admin-order-actions");

    if (order.status === "cancelado") {
      wrapper.append(element("span", "admin-no-actions", "Pago bloqueado por cancelación"));
    } else {
      const paymentButton = element("button",
        order.paymentStatus === "pagado" ? "button button-outline admin-action-button" : "button button-primary admin-action-button",
        order.paymentStatus === "pagado" ? "Marcar pendiente" : "Verificar pago");
      paymentButton.type = "button";
      paymentButton.dataset.adminAction = "payment";
      paymentButton.dataset.orderId = order.id;
      paymentButton.dataset.nextStatus = order.paymentStatus === "pagado" ? "pendiente" : "pagado";
      paymentButton.setAttribute("aria-label", `${paymentButton.textContent} del pedido ${order.code}`);
      wrapper.append(paymentButton);
    }

    const allowedNext = TRANSITIONS[order.status] || [];
    if (allowedNext.length > 0) {
      const statusGroup = element("div", "admin-status-action");
      const select = element("select", "admin-status-select");
      select.setAttribute("aria-label", `Nuevo estado para ${order.code}`);
      select.dataset.statusSelect = order.id;
      select.append(new Option("Cambiar estado…", ""));
      allowedNext.forEach((status) => select.append(new Option(STATUS_LABELS[status] || status, status)));
      const statusButton = element("button", "button button-outline admin-action-button", "Aplicar");
      statusButton.type = "button";
      statusButton.dataset.adminAction = "status";
      statusButton.dataset.orderId = order.id;
      statusButton.setAttribute("aria-label", `Aplicar nuevo estado al pedido ${order.code}`);
      statusButton.disabled = true;
      select.addEventListener("change", () => { statusButton.disabled = !select.value; });
      statusGroup.append(select, statusButton);
      wrapper.append(statusGroup);
    } else {
      wrapper.append(element("span", "admin-no-actions", "Estado final"));
    }
    const printButton = element("button", "button button-outline admin-action-button", "Imprimir comanda");
    printButton.type = "button";
    printButton.dataset.printOrder = order.id;
    printButton.setAttribute("aria-label", `Imprimir comanda del pedido ${order.code}`);
    wrapper.append(printButton);

    cell.append(wrapper);
    return cell;
  }

  function csvCell(value, protectFormula = true) {
    let text = String(value ?? "");
    // Evita que celdas textuales se interpreten como fórmulas al abrir el CSV.
    if (protectFormula && /^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function getOrderItemDescription(item) {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const name = String(item.name || "Producto");
    const customizations = item.customizations || {};
    const labels = { arroz: "arroz", papa: "papa", ensalada: "ensalada", cremas: "cremas" };
    const options = Object.entries(customizations)
      .filter(([, value]) => value && value !== "normal")
      .map(([key, value]) => `${value === "sin" ? "sin" : "extra"} ${labels[key] || key}`);
    return `${quantity} x ${name}${options.length ? ` (${options.join("; ")})` : ""}`;
  }

  function exportFilteredOrdersCSV() {
    if (!hasAdminSession(ordersMessage)) return;
    try {
      const orders = PBData.getAdminOrders(getOrderFilters());
      if (!orders.length) {
        setMessage(ordersMessage, "No hay pedidos que coincidan con los filtros para exportar.", "error");
        return;
      }

      const headers = [
        "Código", "Fecha de creación", "Cliente", "Correo", "Teléfono",
        "Fecha y hora de recojo", "Productos", "Total (PEN)",
        "Método de pago", "Estado del pago", "Estado del pedido", "Nota para cocina"
      ];
      const rows = orders.map((order) => {
        const items = (Array.isArray(order.items) ? order.items : [])
          .map(getOrderItemDescription).join(" | ");
        return [
          csvCell(order.code),
          csvCell(formatDate(order.createdAt)),
          csvCell(order.customer?.name || "Cliente sin nombre"),
          csvCell(order.customer?.email || ""),
          csvCell(order.phone || order.customer?.phone || ""),
          csvCell(formatDate(order.pickupAt)),
          csvCell(items),
          Number.isFinite(Number(order.total)) ? Number(order.total).toFixed(2) : "0.00",
          csvCell(paymentMethodLabel(order.paymentMethod)),
          csvCell(PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus || "Desconocido"),
          csvCell(STATUS_LABELS[order.status] || order.status || "Desconocido"),
          csvCell(order.note || "")
        ].join(",");
      });

      // BOM UTF-8 conserva tildes y caracteres españoles al abrirlo en Excel.
      const csv = `\uFEFF${headers.map((value) => csvCell(value)).join(",")}\r\n${rows.join("\r\n")}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const objectUrl = URL.createObjectURL(blob);
      const link = element("a");
      link.href = objectUrl;
      link.download = `pelicanos-pedidos-${localDateKey(new Date())}.csv`;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      setMessage(ordersMessage, `Se exportaron ${orders.length} pedido(s) con los filtros actuales.`, "success");
    } catch (error) {
      setMessage(ordersMessage, error.message || "No se pudieron exportar los pedidos.", "error");
    }
  }

  function createPrintNode(doc, tag, className = "", text = "") {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== "") node.textContent = String(text);
    return node;
  }

  function printKitchenComanda(orderId) {
    if (!hasAdminSession(ordersMessage)) return;
    let printWindow;
    try {
      const order = PBData.getOrderById(orderId);
      if (!order) throw new Error("No se encontró el pedido que deseas imprimir.");

      // Se abre dentro del clic del usuario para reducir el riesgo de bloqueo de ventanas emergentes.
      printWindow = window.open("", "_blank", "width=460,height=760");
      if (!printWindow) {
        setMessage(ordersMessage, "El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes para este sitio e inténtalo nuevamente.", "error");
        return;
      }

      const doc = printWindow.document;
      doc.open();
      doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Comanda de cocina</title><style>
        *{box-sizing:border-box}body{margin:0;padding:18px;background:#f3f0eb;color:#201d19;font-family:Arial,Helvetica,sans-serif}.toolbar{display:flex;justify-content:center;gap:10px;margin:0 auto 16px;max-width:420px}.toolbar button{padding:10px 16px;border:1px solid #a9431c;border-radius:7px;background:#a9431c;color:#fff;font-weight:700;cursor:pointer}.toolbar button.secondary{background:#fff;color:#713019}.ticket{width:min(100%,360px);margin:0 auto;padding:18px;background:#fff;border:1px dashed #8c8175}.brand{text-align:center;font-size:20px;font-weight:900;letter-spacing:.04em}.subtitle{text-align:center;margin:5px 0 15px;font-size:11px;letter-spacing:.16em;font-weight:800}.rule{border:0;border-top:1px dashed #82786d;margin:12px 0}.code{text-align:center;font-size:23px;font-weight:900;letter-spacing:.06em;margin:8px 0}.status{text-align:center;font-size:12px;font-weight:700;margin-bottom:12px}.meta{display:grid;gap:6px;font-size:12px}.meta-row{display:flex;justify-content:space-between;gap:12px}.meta-row strong{text-align:right}.section-title{font-size:12px;font-weight:900;text-transform:uppercase;margin:13px 0 8px}.items{list-style:none;margin:0;padding:0;display:grid;gap:10px}.item{border-bottom:1px dotted #b9afa4;padding-bottom:8px}.item-main{display:flex;justify-content:space-between;gap:10px;font-size:13px;font-weight:800}.item-options{margin-top:4px;font-size:11px;color:#514b44}.note{padding:9px;border:1px solid #d9c9b7;background:#fff8e8;font-size:12px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}.total{display:flex;justify-content:space-between;font-size:16px;font-weight:900}.footer{text-align:center;margin-top:14px;font-size:10px;color:#665e55;line-height:1.4}@page{size:80mm auto;margin:4mm}@media print{body{padding:0;background:#fff}.toolbar{display:none}.ticket{width:100%;max-width:none;margin:0;padding:0;border:0}}
      </style></head><body><div class="toolbar"><button id="print-button" type="button">Imprimir comanda</button><button id="close-button" class="secondary" type="button">Cerrar</button></div><main id="ticket" class="ticket"></main></body></html>`);
      doc.close();
      doc.title = `Comanda ${order.code || "Pelícanos Bros"}`;

      const ticket = doc.getElementById("ticket");
      const add = (parent, tag, className, text) => {
        const node = createPrintNode(doc, tag, className, text);
        parent.append(node);
        return node;
      };
      add(ticket, "div", "brand", "PELÍCANOS BROS");
      add(ticket, "div", "subtitle", "COMANDA DE COCINA");
      add(ticket, "div", "code", order.code || "PEDIDO");
      add(ticket, "div", "status", STATUS_LABELS[order.status] || order.status || "Estado desconocido");
      add(ticket, "hr", "rule");

      const meta = add(ticket, "section", "meta", "");
      [
        ["Recojo", formatDate(order.pickupAt)],
        ["Registrado", formatDate(order.createdAt)],
        ["Cliente", order.customer?.name || "Cliente sin nombre"],
        ["Teléfono", order.phone || order.customer?.phone || "No indicado"]
      ].forEach(([label, value]) => {
        const row = add(meta, "div", "meta-row", "");
        add(row, "span", "", label);
        add(row, "strong", "", value);
      });

      add(ticket, "hr", "rule");
      add(ticket, "h2", "section-title", "Detalle del pedido");
      const list = add(ticket, "ul", "items", "");
      const items = Array.isArray(order.items) ? order.items : [];
      if (!items.length) add(list, "li", "item", "No hay productos registrados.");
      items.forEach((item) => {
        const row = add(list, "li", "item", "");
        const main = add(row, "div", "item-main", "");
        add(main, "span", "", `${Math.max(0, Number(item.quantity) || 0)} × ${item.name || "Producto"}`);
        add(main, "span", "", formatMoney(item.lineTotal ?? item.unitPrice ?? 0));
        const customizations = item.customizations || {};
        const optionLabels = { arroz: "arroz", papa: "papa", ensalada: "ensalada", cremas: "cremas" };
        const options = Object.entries(customizations)
          .filter(([, value]) => value && value !== "normal")
          .map(([key, value]) => `${value === "sin" ? "Sin" : "Extra"} ${optionLabels[key] || key}`);
        if (options.length) add(row, "div", "item-options", options.join(" · "));
      });

      add(ticket, "hr", "rule");
      const total = add(ticket, "div", "total", "");
      add(total, "span", "", "TOTAL");
      add(total, "span", "", formatMoney(order.total));
      add(ticket, "h2", "section-title", "Pago");
      add(ticket, "div", "meta", `${paymentMethodLabel(order.paymentMethod)} · ${PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus || "Pendiente"}`);
      add(ticket, "h2", "section-title", "Nota para cocina");
      add(ticket, "div", "note", order.note || "Sin nota para cocina.");
      add(ticket, "div", "footer", "Documento interno para preparación del pedido.\nGracias por tu preferencia.");

      doc.getElementById("print-button").addEventListener("click", () => {
        printWindow.focus();
        printWindow.print();
      });
      doc.getElementById("close-button").addEventListener("click", () => printWindow.close());
      printWindow.focus();
      setMessage(ordersMessage, `Comanda ${order.code} abierta para imprimir.`, "success");
    } catch (error) {
      if (printWindow && !printWindow.closed) printWindow.close();
      setMessage(ordersMessage, error.message || "No se pudo preparar la comanda.", "error");
    }
  }

  function handlePrintAction(event) {
    const button = event.target.closest("button[data-print-order]");
    if (!button) return;
    event.preventDefault();
    printKitchenComanda(button.dataset.printOrder);
  }

  function renderOrders() {
    if (!ordersBody || !hasAdminSession(ordersMessage)) return;
    try {
      const orders = PBData.getAdminOrders(getOrderFilters());
      const fragment = document.createDocumentFragment();
      if (!orders.length) {
        const row = element("tr");
        const cell = element("td", "table-empty", "No se encontraron pedidos con esos filtros.");
        cell.colSpan = 7;
        row.append(cell);
        fragment.append(row);
      } else {
        orders.forEach((order) => {
          const row = element("tr", "admin-order-row");
          const statusCell = element("td", "admin-status-cell");
          statusCell.append(makeStatusBadge(order.status));
          row.append(makeCell(order.code || "Sin código"), makeCustomerCell(order), makePickupCell(order), makeCell(formatMoney(order.total)), makePaymentCell(order), statusCell, makeActionsCell(order));
          fragment.append(row);
        });
      }
      ordersBody.replaceChildren(fragment);
      setMessage(ordersMessage, `${orders.length} pedido(s) encontrado(s).`);
    } catch (error) {
      ordersBody.replaceChildren();
      setMessage(ordersMessage, error.message || "No se pudieron consultar los pedidos.", "error");
    }
  }

  function renderSummary() {
    if (!dashboard || dashboard.hidden || !hasAdminSession(ordersMessage)) return;
    try {
      const orders = PBData.getAdminOrders();
      const today = localDateKey(new Date());
      const todayOrders = orders.filter((order) => {
        const created = new Date(order.createdAt);
        return !Number.isNaN(created.getTime()) && localDateKey(created) === today;
      });
      const preparing = orders.filter((order) => order.status === "pendiente").length;
      const pendingPayments = orders.filter((order) => order.paymentStatus === "pendiente" && order.status !== "cancelado").length;
      const paidSales = orders.filter((order) => order.paymentStatus === "pagado" && order.status !== "cancelado")
        .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
      const values = {
        "metric-orders": todayOrders.length,
        "metric-pending": preparing,
        "metric-payments": pendingPayments,
        "metric-sales": formatMoney(paidSales)
      };
      Object.entries(values).forEach(([id, value]) => { const node = byId(id); if (node) node.textContent = String(value); });

      const upcomingContainer = byId("summary-upcoming-orders");
      if (upcomingContainer) {
        const upcoming = orders.filter((order) => !["entregado", "cancelado"].includes(order.status))
          .filter((order) => Number.isFinite(Date.parse(order.pickupAt)) && Date.parse(order.pickupAt) >= Date.now())
          .sort((a, b) => Date.parse(a.pickupAt) - Date.parse(b.pickupAt)).slice(0, 5);
        const fragment = document.createDocumentFragment();
        if (!upcoming.length) fragment.append(element("p", "muted", "No hay recojos pendientes."));
        else upcoming.forEach((order) => {
          const item = element("div", "admin-upcoming-item");
          const info = element("div", "admin-upcoming-info");
          info.append(element("strong", "", order.code), element("span", "admin-cell-secondary", order.customer?.name || "Cliente"));
          item.append(info, element("span", "admin-upcoming-time", formatDate(order.pickupAt)));
          fragment.append(item);
        });
        upcomingContainer.replaceChildren(fragment);
      }
    } catch (error) {
      setMessage(ordersMessage, error.message || "No se pudo actualizar el resumen.", "error");
    }
  }

  function appendOrderItems(container, order, compact = false) {
    const list = element("ul", compact ? "kitchen-item-list" : "customer-history-item-list");
    (Array.isArray(order.items) ? order.items : []).forEach((item) => {
      const row = element("li", compact ? "kitchen-item" : "customer-history-item");
      const info = element("div", "history-item-info");
      info.append(element("strong", "", `${Number(item.quantity) || 0} × ${item.name || "Producto"}`));
      const customizations = item.customizations || {};
      const labels = { arroz: "Arroz", papa: "Papa", ensalada: "Ensalada", cremas: "Cremas" };
      const options = Object.entries(customizations)
        .filter(([, value]) => value && value !== "normal")
        .map(([key, value]) => `${labels[key] || key}: ${value === "sin" ? "sin" : "extra"}`);
      if (options.length) info.append(element("span", "admin-cell-secondary", options.join(" · ")));
      row.append(info, element("strong", "history-item-price", formatMoney(item.lineTotal ?? item.unitPrice ?? 0)));
      list.append(row);
    });
    if (!list.childElementCount) list.append(element("li", "admin-cell-secondary", "Sin detalle de productos."));
    container.append(list);
  }

  function makeKitchenCard(order, status) {
    const card = element("article", "kitchen-order-card");
    const header = element("div", "kitchen-card-header");
    header.append(element("strong", "kitchen-order-code", order.code || "Pedido"), makeStatusBadge(status));
    card.append(header);
    const pickup = element("div", "kitchen-card-pickup");
    pickup.append(element("span", "admin-cell-secondary", "Hora de recojo"), element("strong", "", formatDate(order.pickupAt)));
    card.append(pickup);
    card.append(element("p", "kitchen-customer", order.customer?.name || "Cliente sin nombre"));
    card.append(element("p", "admin-cell-secondary", `Teléfono: ${order.phone || order.customer?.phone || "No indicado"}`));
    appendOrderItems(card, order, true);
    if (order.note) card.append(element("p", "kitchen-order-note", `Nota para cocina: ${order.note}`));
    const footer = element("div", "kitchen-card-footer");
    footer.append(element("span", "admin-cell-secondary", `${paymentMethodLabel(order.paymentMethod)} · ${PAYMENT_LABELS[order.paymentStatus] || "Pendiente"}`));
    const column = kitchenColumns[status];
    const action = element("button", "button button-primary kitchen-advance-button", column.action);
    action.type = "button";
    action.dataset.kitchenAction = "advance";
    action.dataset.orderId = order.id;
    action.dataset.nextStatus = column.next;
    action.setAttribute("aria-label", `${column.action} para el pedido ${order.code}`);
    footer.append(action);
    const printButton = element("button", "button button-outline kitchen-print-button", "Imprimir comanda");
    printButton.type = "button";
    printButton.dataset.printOrder = order.id;
    printButton.setAttribute("aria-label", `Imprimir comanda del pedido ${order.code}`);
    footer.append(printButton);
    card.append(footer);
    return card;
  }

  function pickupSortValue(order) {
    const timestamp = Date.parse(order?.pickupAt || "");
    // Si un registro antiguo no contiene una fecha válida, se muestra al final.
    return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
  }

  function renderKitchen() {
    if (!hasAdminSession(kitchenMessage)) return;
    try {
      const orders = PBData.getAdminOrders();
      Object.entries(kitchenColumns).forEach(([status, column]) => {
        if (!column.container) return;
        const matching = orders.filter((order) => order.status === status)
          .sort((a, b) => pickupSortValue(a) - pickupSortValue(b));
        const fragment = document.createDocumentFragment();
        if (!matching.length) fragment.append(element("p", "kitchen-empty", status === "pendiente" ? "No hay pedidos por preparar." : status === "en_preparacion" ? "No hay pedidos en preparación." : "No hay pedidos listos para recoger."));
        else matching.forEach((order) => fragment.append(makeKitchenCard(order, status)));
        column.container.replaceChildren(fragment);
        if (column.count) column.count.textContent = String(matching.length);
      });
      setMessage(kitchenMessage, `${orders.filter((order) => ["pendiente", "en_preparacion", "listo"].includes(order.status)).length} pedido(s) activos en cocina.`);
    } catch (error) {
      setMessage(kitchenMessage, error.message || "No se pudo cargar el tablero de cocina.", "error");
    }
  }

  function handleKitchenAction(event) {
    const button = event.target.closest("button[data-kitchen-action]");
    if (!button) return;
    const orderId = button.dataset.orderId;
    const nextStatus = button.dataset.nextStatus;
    if (!orderId || !nextStatus) return;
    try {
      const order = PBData.updateOrderStatus(orderId, nextStatus);
      renderKitchen();
      renderOrders();
      renderSummary();
      setMessage(kitchenMessage, `${order.code}: ${STATUS_LABELS[order.status]}.`, "success");
    } catch (error) {
      setMessage(kitchenMessage, error.message || "No se pudo avanzar el pedido.", "error");
    }
  }

  function renderCustomers() {
    if (!customersBody || !hasAdminSession(customersMessage)) return;
    try {
      const term = String(customerSearch?.value || "").trim().toLocaleLowerCase("es");
      const customers = PBData.getAdminCustomers().filter((customer) => !term || [customer.name, customer.email, customer.phone]
        .some((value) => String(value || "").toLocaleLowerCase("es").includes(term)));
      const fragment = document.createDocumentFragment();
      if (!customers.length) {
        const row = element("tr");
        const cell = element("td", "table-empty", term ? "No se encontraron clientes con esa búsqueda." : "Todavía no hay clientes registrados.");
        cell.colSpan = 7;
        row.append(cell);
        fragment.append(row);
      } else {
        customers.forEach((customer) => {
          const row = element("tr", "admin-customer-row");
          const nameCell = element("td");
          nameCell.append(element("strong", "admin-cell-primary", customer.name || "Sin nombre"));
          row.append(nameCell, makeCell(customer.email || "Sin correo"), makeCell(customer.phone || "Sin teléfono"), makeCell(String(customer.orderCount)), makeCell(formatMoney(customer.paidTotal)), makeCell(customer.lastOrder ? `${customer.lastOrder.code} · ${formatDate(customer.lastOrder.createdAt)}` : "Sin pedidos"));
          const actionCell = element("td");
          const historyButton = element("button", "button button-outline admin-action-button", "Ver historial");
          historyButton.type = "button";
          historyButton.dataset.customerHistory = customer.id;
          historyButton.setAttribute("aria-label", `Ver historial de ${customer.name || "este cliente"}`);
          actionCell.append(historyButton);
          row.append(actionCell);
          fragment.append(row);
        });
      }
      customersBody.replaceChildren(fragment);
      setMessage(customersMessage, `${customers.length} cliente(s) encontrado(s).`);
    } catch (error) {
      customersBody.replaceChildren();
      setMessage(customersMessage, error.message || "No se pudieron consultar los clientes.", "error");
    }
  }

  function appendHistoryOrder(container, order) {
    const card = element("article", "customer-history-order-card");
    const header = element("div", "customer-history-order-header");
    const title = element("div");
    title.append(element("strong", "customer-history-order-code", order.code || "Pedido sin código"), element("span", "admin-cell-secondary", `Creado: ${formatDate(order.createdAt)}`));
    header.append(title, makeStatusBadge(order.status));
    card.append(header);
    const info = element("div", "customer-history-order-meta");
    info.append(element("span", "", `Recojo: ${formatDate(order.pickupAt)}`), element("span", "", `Teléfono: ${order.phone || "No indicado"}`), element("span", "", `Pago: ${paymentMethodLabel(order.paymentMethod)} · ${PAYMENT_LABELS[order.paymentStatus] || "Pendiente"}`));
    card.append(info);
    appendOrderItems(card, order, false);
    card.append(element("p", "customer-history-total", `Total: ${formatMoney(order.total)}`));
    if (order.note) card.append(element("p", "kitchen-order-note", `Nota: ${order.note}`));
    const details = element("details", "customer-history-events");
    details.append(element("summary", "", `Movimientos (${Array.isArray(order.events) ? order.events.length : 0})`));
    const list = element("ol", "customer-history-event-list");
    (Array.isArray(order.events) ? order.events : []).forEach((event) => {
      const item = element("li", "");
      item.append(element("strong", "", event.description || event.type || "Movimiento"), element("span", "admin-cell-secondary", formatDate(event.createdAt)));
      list.append(item);
    });
    if (!list.childElementCount) list.append(element("li", "admin-cell-secondary", "No hay movimientos registrados."));
    details.append(list);
    card.append(details);
    container.append(card);
  }

  function openCustomerHistory(customerId) {
    try {
      const result = PBData.getAdminCustomerHistory(customerId);
      customerHistoryTitle.textContent = `Historial de ${result.customer.name}`;
      customerHistorySubtitle.textContent = `${result.customer.email || "Sin correo"} · ${result.customer.phone || "Sin teléfono"}`;
      const fragment = document.createDocumentFragment();
      if (!result.orders.length) fragment.append(element("p", "customer-history-empty", "Este cliente todavía no tiene pedidos."));
      else result.orders.forEach((order) => appendHistoryOrder(fragment, order));
      customerHistoryContent.replaceChildren(fragment);
      if (!customerHistoryDialog.open) customerHistoryDialog.showModal();
    } catch (error) {
      setMessage(customersMessage, error.message || "No se pudo abrir el historial del cliente.", "error");
    }
  }

  function makeAvailabilityBadge(available) {
    return element("span", `product-availability-badge ${available ? "is-available" : "is-unavailable"}`, available ? "Disponible" : "Agotado");
  }

  function populateProductForm(product) {
    if (!product) {
      if (productSelect) productSelect.value = "";
      if (productPrice) productPrice.value = "";
      if (productAvailability) productAvailability.value = "true";
      if (productCurrentName) productCurrentName.textContent = "Ninguno";
      if (productCurrentCategory) productCurrentCategory.textContent = "Selecciona un producto para editarlo.";
      return;
    }
    productSelect.value = product.id;
    productPrice.value = Number(product.price).toFixed(2);
    productAvailability.value = product.available ? "true" : "false";
    productCurrentName.textContent = product.name;
    productCurrentCategory.textContent = CATEGORY_LABELS[product.category] || product.category;
  }

  function renderProducts() {
    if (!productsBody || !hasAdminSession(menuMessage)) return;
    try {
      const products = PBData.getProducts();
      const selectedId = productSelect?.value || "";
      const fragment = document.createDocumentFragment();
      if (productSelect) {
        const options = [new Option("Selecciona un producto", "")];
        products.forEach((product) => options.push(new Option(product.name, product.id)));
        productSelect.replaceChildren(...options);
      }
      if (!products.length) {
        const row = element("tr");
        const cell = element("td", "table-empty", "No hay productos registrados.");
        cell.colSpan = 5;
        row.append(cell);
        fragment.append(row);
      } else {
        products.forEach((product) => {
          const row = element("tr", "admin-product-row");
          row.append(makeCell(product.name), makeCell(CATEGORY_LABELS[product.category] || product.category), makeCell(formatMoney(product.price)));
          const availabilityCell = element("td");
          availabilityCell.append(makeAvailabilityBadge(product.available));
          row.append(availabilityCell);
          const actionCell = element("td");
          const editButton = element("button", "button button-outline admin-action-button", "Editar");
          editButton.type = "button";
          editButton.dataset.editProduct = product.id;
          editButton.setAttribute("aria-label", `Editar ${product.name}`);
          actionCell.append(editButton);
          row.append(actionCell);
          fragment.append(row);
        });
      }
      productsBody.replaceChildren(fragment);
      const selected = products.find((product) => product.id === selectedId) || null;
      populateProductForm(selected);
      setMessage(menuMessage, `${products.length} producto(s) en el catálogo.`);
    } catch (error) {
      productsBody.replaceChildren();
      setMessage(menuMessage, error.message || "No se pudo consultar el menú.", "error");
    }
  }

  function handleOrderAction(event) {
    const button = event.target.closest("button[data-admin-action]");
    if (!button || !ordersBody?.contains(button)) return;
    const { adminAction, orderId } = button.dataset;
    if (!orderId) return;
    try {
      let successMessage = "";
      if (adminAction === "payment") {
        const order = PBData.updatePaymentStatus(orderId, button.dataset.nextStatus);
        successMessage = `${order.code}: pago ${PAYMENT_LABELS[order.paymentStatus]?.toLowerCase() || order.paymentStatus}.`;
      } else if (adminAction === "status") {
        const select = [...ordersBody.querySelectorAll("select[data-status-select]")].find((node) => node.dataset.statusSelect === orderId);
        const nextStatus = select?.value;
        if (!nextStatus) { setMessage(ordersMessage, "Selecciona el nuevo estado antes de aplicar.", "error"); return; }
        if (nextStatus === "cancelado" && !window.confirm("¿Confirmas la cancelación de este pedido?")) return;
        const order = PBData.updateOrderStatus(orderId, nextStatus);
        successMessage = `${order.code}: estado actualizado a ${STATUS_LABELS[order.status]}.`;
      }
      renderOrders(); renderSummary(); renderKitchen(); renderCustomers();
      if (successMessage) setMessage(ordersMessage, successMessage, "success");
    } catch (error) {
      setMessage(ordersMessage, error.message || "No se pudo actualizar el pedido.", "error");
    }
  }

  function handleProductTableClick(event) {
    const button = event.target.closest("button[data-edit-product]");
    if (!button || !productsBody?.contains(button)) return;
    const product = PBData.getProductById(button.dataset.editProduct);
    populateProductForm(product);
    productPrice?.focus();
    setMessage(menuMessage, product ? `Editando ${product.name}.` : "No se encontró el producto.", product ? "info" : "error");
  }

  function handleCustomerTableClick(event) {
    const button = event.target.closest("button[data-customer-history]");
    if (!button || !customersBody?.contains(button)) return;
    openCustomerHistory(button.dataset.customerHistory);
  }

  function setMessageOnLogin(message) { if (loginMessage) loginMessage.textContent = message; }

  navButtons.forEach((button) => button.addEventListener("click", () => setActivePanel(button)));

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessageOnLogin("Verificando credenciales administrativas…");
    const formData = new FormData(loginForm);
    try {
      const admin = await PBData.authenticateAdmin({ username: formData.get("username"), password: formData.get("password") });
      PBData.setAdminSession(admin.id);
      loginForm.reset();
      showDashboard(admin);
    } catch (error) {
      setMessageOnLogin(error.message || "No se pudo iniciar sesión.");
    }
  });

  logoutButton?.addEventListener("click", () => {
    PBData.clearAdminSession();
    showLogin();
    setMessageOnLogin("Has cerrado la sesión administrativa.");
  });

  ordersBody?.addEventListener("click", handleOrderAction);
  ordersBody?.addEventListener("click", handlePrintAction);
  Object.values(kitchenColumns).forEach((column) => {
    column.container?.addEventListener("click", handleKitchenAction);
    column.container?.addEventListener("click", handlePrintAction);
  });
  exportCsvButton?.addEventListener("click", exportFilteredOrdersCSV);
  customersBody?.addEventListener("click", handleCustomerTableClick);
  productsBody?.addEventListener("click", handleProductTableClick);

  [searchInput, statusFilter, paymentFilter, dateFilter].forEach((control) => {
    control?.addEventListener("input", renderOrders);
    control?.addEventListener("change", renderOrders);
  });
  refreshButton?.addEventListener("click", () => { renderOrders(); renderSummary(); setMessage(ordersMessage, "Pedidos actualizados.", "success"); });
  kitchenRefreshButton?.addEventListener("click", renderKitchen);
  customerSearch?.addEventListener("input", renderCustomers);
  customersRefreshButton?.addEventListener("click", renderCustomers);
  customerHistoryClose?.addEventListener("click", () => customerHistoryDialog?.close());

  productSelect?.addEventListener("change", () => {
    const product = PBData.getProductById(productSelect.value);
    populateProductForm(product);
  });
  productForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      if (!productSelect.value) throw new Error("Selecciona un producto antes de guardar.");
      const updated = PBData.updateProductCatalog({
        id: productSelect.value,
        price: Number(productPrice.value),
        available: productAvailability.value === "true"
      });
      renderProducts();
      setMessage(menuMessage, `${updated.name}: cambios guardados correctamente.`, "success");
    } catch (error) {
      setMessage(menuMessage, error.message || "No se pudieron guardar los cambios del producto.", "error");
    }
  });
  productCancelEdit?.addEventListener("click", () => { populateProductForm(null); setMessage(menuMessage, "Edición cancelada."); });
  restoreMenuButton?.addEventListener("click", () => {
    if (!window.confirm("¿Restaurar los nueve productos, sus precios y su disponibilidad inicial? Esta acción reemplazará los cambios actuales del catálogo.")) return;
    try {
      PBData.restoreOriginalMenu();
      populateProductForm(null);
      renderProducts();
      setMessage(menuMessage, "El menú original fue restaurado.", "success");
    } catch (error) {
      setMessage(menuMessage, error.message || "No se pudo restaurar el menú.", "error");
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === PBData.STORAGE_KEYS.adminSession || event.key === PBData.STORAGE_KEYS.users) {
      const admin = PBData.getAdminSession();
      if (admin) showDashboard(admin); else showLogin();
      return;
    }
    if (event.key === PBData.STORAGE_KEYS.orders) {
      renderOrders(); renderSummary(); renderKitchen(); renderCustomers();
    }
    if (event.key === PBData.STORAGE_KEYS.products) renderProducts();
  });

  // Actualización automática cada 30 segundos mientras el panel esté visible.
  window.setInterval(() => {
    if (!dashboard || dashboard.hidden || document.hidden) return;
    const active = navButtons.find((button) => button.classList.contains("is-active"))?.dataset.panel;
    renderSummary();
    if (active) renderActivePanel(active);
  }, 30000);

  const activeAdmin = PBData.getAdminSession();
  if (activeAdmin) showDashboard(activeAdmin); else showLogin();
})();
