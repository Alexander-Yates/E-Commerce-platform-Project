// cartTest.js — isolated logic for testing

function addToCart(cart, product) {
  // check if the product already exists
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    // increase quantity if product already exists
    existing.quantity = (existing.quantity || 1) + 1;
    return cart;
  }
  // otherwise, add the new product
  return [...cart, { ...product, quantity: 1 }];
}

module.exports = { addToCart };
