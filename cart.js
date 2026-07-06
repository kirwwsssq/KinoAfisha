document.addEventListener("DOMContentLoaded", () => {
    const checkoutBtn = document.getElementById("checkoutBtn");
    const container = document.querySelector(".cart-items");

    let cart = JSON.parse(localStorage.getItem("cart"));

    if (!cart || !cart.seats || cart.seats.length === 0) {
        if (container) container.innerHTML = "<p style='color: white; text-align: center;'>Корзина пуста</p>";
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    if (!cart.date || cart.date.toLowerCase() === "сегодня" || cart.date === "Дата не указана") {
        cart.date = "24.06.2026"; 
        localStorage.setItem("cart", JSON.stringify(cart)); 
    }

    const ticketPrice = cart.price || 11; 
    const sessionTime = cart.time || "16:00"; 
    const sessionDate = cart.date; 

    const hallDisplay = String(cart.hall || 1).toLowerCase().includes('зал') ? cart.hall : `Зал ${cart.hall || 1}`;

    if (container) {
        container.innerHTML = cart.seats.map(seat => `
            <div class="cart-item">
                <img src="${cart.movieImage || 'poster.jpg'}" class="cart-poster" alt="">
                <div class="cart-info">
                    <h2>${cart.movieTitle}</h2>
                    <div class="ticket-details">
                        <span>${hallDisplay}</span> • <span>Ряд ${seat.row}</span> • <span>Место ${seat.seat}</span>
                    </div>
                    <div class="ticket-details date-time">
                        <span class="time-highlight">${sessionTime}</span>
                        <span class="date-highlight">${sessionDate}</span>
                    </div>
                    <button class="remove-btn" onclick="removeSeat(${seat.seatId})">Удалить билет</button>
                </div>
                <div class="cart-price">${ticketPrice} BYN</div>
            </div>
        `).join("");
    }

    const totalTicketsPrice = cart.seats.length * ticketPrice;
    if (document.getElementById("ticketsPriceSum")) document.getElementById("ticketsPriceSum").textContent = `${totalTicketsPrice} BYN`;
    if (document.getElementById("totalPriceSum")) document.getElementById("totalPriceSum").textContent = `${totalTicketsPrice} BYN`;

    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {
            window.location.href = "kart.html"; 
        });
    }
});

function removeSeat(seatId) {
    let cart = JSON.parse(localStorage.getItem("cart"));
    if (!cart) return;
    cart.seats = cart.seats.filter(s => s.seatId !== seatId);
    if (cart.seats.length === 0) {
        localStorage.removeItem("cart");
    } else {
        localStorage.setItem("cart", JSON.stringify(cart));
    }
    location.reload();
}