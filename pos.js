const defaultRegistry = {
    milk: { price: 50, stock: 50 },
    sugar: { price: 100, stock: 50 },
    unga: { price: 120, stock: 50 },
    bread: { price: 40, stock: 50 },
    eggs: { price: 10, stock: 300 }
};

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value);

const getRegister = () => {
    const stored = localStorage.getItem("pos-register");

    if (!stored) {
        localStorage.setItem("pos-register", JSON.stringify(defaultRegistry));
        return { ...defaultRegistry };
    }

    try {
        const parsed = JSON.parse(stored);
        return parsed && typeof parsed === "object" ? parsed : { ...defaultRegistry };
    } catch {
        localStorage.setItem("pos-register", JSON.stringify(defaultRegistry));
        return { ...defaultRegistry };
    }
};

const saveRegister = (data) => {
    localStorage.setItem("pos-register", JSON.stringify(data));
};

const renderStock = () => {
    const stockDiv = document.querySelector(".stock-div");
    const register = getRegister();
    const items = Object.entries(register)
        .map(([item, details]) => `
            <li>
                <span>${item}</span>
                <span>${details.stock} in stock</span>
                <span>${formatCurrency(details.price)}</span>
            </li>
        `)
        .join("");

    stockDiv.innerHTML = `
        <h3>Current stock</h3>
        <ul class="stock-list">${items}</ul>
    `;
};

const setError = (message) => {
    const errDiv = document.querySelector(".errors");
    errDiv.textContent = message;
    errDiv.classList.add("visible");
};

const clearError = () => {
    const errDiv = document.querySelector(".errors");
    errDiv.textContent = "";
    errDiv.classList.remove("visible");
};

const checkStock = (item, quantity) => {
    const register = getRegister();
    const itemData = register[item];

    if (!itemData) {
        return "notexist";
    }

    if (Number(itemData.stock) < Number(quantity)) {
        return "notenough";
    }

    return "ok";
};

const deduct = (item, quantity) => {
    const register = getRegister();
    const itemData = register[item];

    if (!itemData) {
        return { status: "error", message: "Item does not exist." };
    }

    const amount = Number(quantity);
    const remainingStock = Number(itemData.stock) - amount;

    register[item] = {
        ...itemData,
        stock: remainingStock
    };

    saveRegister(register);
    renderStock();

    return {
        status: "ok",
        price: Number(itemData.price),
        remaining: remainingStock
    };
};

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".main-pos-form");
    const confirmBox = document.querySelector(".confirm");
    const errDiv = document.querySelector(".errors");

    renderStock();

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError();

        const formData = Object.fromEntries(new FormData(form));
        const serial = String(formData.serial || "").trim().toLowerCase();
        const quantity = Number(formData.quantity);

        if (!serial) {
            setError("Please enter an item code.");
            return;
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            setError("Quantity must be a whole number greater than zero.");
            return;
        }

        const stockState = checkStock(serial, quantity);

        if (stockState === "notexist") {
            setError("This item is not available in the register.");
            return;
        }

        if (stockState === "notenough") {
            setError("Not enough stock for this sale.");
            return;
        }

        confirmBox.dataset.amount = String(quantity);
        confirmBox.dataset.item = serial;
        confirmBox.innerHTML = '<button type="button" class="confirm-sale">Confirm sale</button>';
    });

    confirmBox.addEventListener("click", (event) => {
        const button = event.target.closest(".confirm-sale");

        if (!button) {
            return;
        }

        const amount = Number(confirmBox.dataset.amount);
        const item = confirmBox.dataset.item;

        if (!item || !Number.isFinite(amount) || amount <= 0) {
            setError("Please select a valid item and quantity first.");
            return;
        }

        const result = deduct(item, amount);

        if (result.status === "ok") {
            errDiv.innerHTML = `Sold ${amount} unit${amount > 1 ? "s" : ""} of ${item} for ${formatCurrency(amount * result.price)}.`;
            errDiv.classList.add("visible");
            confirmBox.innerHTML = "";
            form.reset();
            return;
        }

        setError(result.message || "Error processing the sale.");
    });
});