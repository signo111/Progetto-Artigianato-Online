'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

const checkoutButton = document.querySelector('.checkout-btn');

// Aggiungi evento click
checkoutButton.addEventListener('click', () => {
  const url = 'https://buy.stripe.com/test_8x2cN57RQct68eq6AEfrW00'; 
  window.location.href = url;
});

// Stripe Products
export const products = [
  {
    name: 'Prodotto 1',
    link: process.env.NODE_ENV === 'development'
      ? 'https://buy.stripe.com/test_8x2cN57RQct68eq6AEfrW00'
      : '',
    price: 19.99,
  }
];
export default Pricing;