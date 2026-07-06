const API = "https://localhost:7113/api";

document.addEventListener("DOMContentLoaded", () => {
    const cart = JSON.parse(localStorage.getItem("cart"));

    if (!cart || !cart.seats || cart.seats.length === 0) {
        alert("Ошибка: заказ не найден или корзина пуста!");
        window.location.href = "cart.html";
        return;
    }
    let currentUserId = 1; 
    const savedUser = JSON.parse(localStorage.getItem("user")) || JSON.parse(localStorage.getItem("currentUser"));
    if (savedUser) {
        currentUserId = savedUser.userId || savedUser.User_ID || savedUser.id || 1;
    }

    const BACKEND_URL = "http://localhost:5164"; 
    let userSavedCards = []; 

    const payMovieTitle = document.getElementById("payMovieTitle");
    const payCinema = document.getElementById("payCinema");
    const payHall = document.getElementById("payHall");
    if (payMovieTitle) payMovieTitle.textContent = cart.movieTitle || "Фильм";
    if (payCinema) payCinema.textContent = cart.cinema || "Кинотеатр";
    if (payHall) payHall.textContent = `Зал ${cart.hall || 1}`;
    
    // 2. Подставляем картинку постера
    const orderImg = document.getElementById("orderImg");
    if (orderImg) {
        orderImg.src = cart.movieImage || "poster.jpg";
    }
    let finalDate = cart.date || "2026-06-28";
    let finalTime = cart.time || "16:00";
    if (cart.sessionDateTime && cart.sessionDateTime.includes('T')) {
        const parts = cart.sessionDateTime.split('T');
        finalDate = parts[0]; 
        finalTime = parts[1].substring(0, 5); 
    }

    const payDate = document.getElementById("payDate");
    const payTime = document.getElementById("payTime");
    if (payDate) payDate.textContent = finalDate;
    if (payTime) payTime.textContent = finalTime;
    const paySeatsList = document.getElementById("paySeatsList");
    if (paySeatsList) {
        const seatsString = cart.seats.map(s => `Ряд ${s.row}, Место ${s.seat}`).join("<br>");
        paySeatsList.innerHTML = seatsString;
    }
    const count = cart.seats.length;
    let ticketWord = "билетов";
    if (count === 1) ticketWord = "билет";
    else if (count > 1 && count < 5) ticketWord = "билета";
    
    const payTicketsCount = document.getElementById("payTicketsCount");
    if (payTicketsCount) payTicketsCount.textContent = `${count} ${ticketWord}`;
    const ticketPrice = parseInt(cart.price) || 11; 
    const totalSum = count * ticketPrice;
    const payTotalAmount = document.getElementById("payTotalAmount");
    if (payTotalAmount) payTotalAmount.textContent = `${totalSum} BYN`;
    function checkAndLoadCards() {
        const selectCard = document.getElementById("select-saved-card");
        const wrapper = document.getElementById("saved-cards-wrapper");

        if (!selectCard || !wrapper) return;

        fetch(`${BACKEND_URL}/api/cards/user/${currentUserId}`)
            .then(res => res.json())
            .then(cards => {
                if (cards && cards.length > 0) {
                    userSavedCards = cards;
                    wrapper.style.display = "block";
                    selectCard.innerHTML = '<option value="new">— Использовать новую карту —</option>';
                    cards.forEach(card => {
                        const maskedNum = `•••• •••• •••• ${card.cardNumber.slice(-4)}`;
                        const option = document.createElement("option");
                        option.value = card.cardId;
                        option.textContent = `Карта ${maskedNum} (${card.cardHolder})`;
                        selectCard.appendChild(option);
                    });
                }
            })
            .catch(err => console.error("Ошибка при получении сохраненных карт:", err));
        selectCard.addEventListener("change", (e) => {
            const value = e.target.value;
            const saveCardLabel = document.getElementById("save-card-label");

            if (value === "new") {
                document.getElementById("card-number").value = "";
                document.getElementById("card-expiry").value = "";
                document.getElementById("card-holder").value = "";
                if (saveCardLabel) saveCardLabel.style.display = "block"; 
            } else {
                const selected = userSavedCards.find(c => c.cardId == value);
                if (selected) {
                    const rawNum = selected.cardNumber;
                    document.getElementById("card-number").value = rawNum.match(/.{1,4}/g)?.join(' ') || rawNum;
                    document.getElementById("card-expiry").value = selected.expiryDate;
                    document.getElementById("card-holder").value = selected.cardHolder;
                    if (saveCardLabel) saveCardLabel.style.display = "none"; 
                }
            }
        });
    }

   checkAndLoadCards();

    const paymentForm = document.querySelector(".payment-form");
    if (paymentForm) {
        paymentForm.addEventListener("submit", function(e) {
            e.preventDefault();

            const isNewCard = document.getElementById("select-saved-card")?.value === "new" || !document.getElementById("select-saved-card");
            const shouldSave = document.getElementById("save-card")?.checked;

            if (isNewCard && shouldSave) {
                const cardData = {
                    userId: parseInt(currentUserId),
                    cardNumber: document.getElementById("card-number").value.replace(/\s/g, ''),
                    cardHolder: document.getElementById("card-holder").value.trim(),
                    expiryDate: document.getElementById("card-expiry").value.trim()
                };

                fetch(`${BACKEND_URL}/api/cards`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cardData)
                })
                .then(res => {
                    if (res.ok) console.log("Новая карта была параллельно привязана к аккаунту.");
                })
                .catch(err => console.error("Не удалось сохранить карту на сервере:", err));
            }
            paymentForm.style.display = "none";
            const smsBlock = document.getElementById("sms-verification");
            if (smsBlock) {
                smsBlock.style.display = "block";
                const smsCodeInput = document.getElementById("sms-code");
                if (smsCodeInput) smsCodeInput.focus();
            }
        });
    }

    const confirmSmsBtn = document.getElementById("confirm-sms-btn");
    if (confirmSmsBtn) {
        confirmSmsBtn.addEventListener("click", async () => {
            const smsCodeInput = document.getElementById("sms-code");
            if (smsCodeInput && smsCodeInput.value.length < 4) {
                alert("Введите корректный 4-значный код!");
                return;
            }

            confirmSmsBtn.disabled = true;
            confirmSmsBtn.innerText = 'Проверка...';

            // Генерируем уникальный код заранее
            const generatedTicketCode = crypto.randomUUID();

            const ticketPayload = {
                userId: parseInt(currentUserId),
                sessionId: parseInt(cart.sessionId),
                seatIds: cart.seats.map(seat => parseInt(seat.seatId || seat.id)),
                ticketCode: generatedTicketCode // Передаем строку на сервер!
            };

            try {
                const response = await fetch(`${BACKEND_URL}/api/MyTickets/buy`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ticketPayload)
                });

                if (response.ok) {
                    console.log("QR код билета записан:", generatedTicketCode);
                    alert(`Оплата на сумму ${totalSum} BYN прошла успешно! Приятного просмотра.`);

const qrPayload = {
    ticketCode: generatedTicketCode,
    movie: cart.movieTitle,
    cinema: cart.cinema, // 🔥 ДОБАВИТЬ ЭТУ СТРОКУ!
    session: cart.sessionDateTime,
    hall: cart.hall,
    seats: cart.seats
};
localStorage.setItem("lastTicketQR", JSON.stringify(qrPayload));
                    localStorage.removeItem("cart");
                    window.location.href = "profile.html";
                } else {
                    const errData = await response.json().catch(() => ({}));
                    alert(`Ошибка при оформлении билетов: ${errData.message || "Не удалось сохранить билеты на сервере."}`);
                    confirmSmsBtn.disabled = false;
                    confirmSmsBtn.innerText = 'Подтвердить';
                }
            } catch (error) {
                console.error("Ошибка соединения с C# контроллером билетов:", error);
                alert("Ошибка соединения с сервером. Билеты не были куплены.");
                confirmSmsBtn.disabled = false;
                confirmSmsBtn.innerText = 'Подтвердить';
            }
        });
    }
});