// simple UUID mock function for tests
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const { addToCart } = require("../websitePages/Cart/cartTest");

describe("Buyer Cart Functionality", () => {
  test("adds a new product to an empty cart", () => {
    const cart = [];
    const product = {
      id: uuidv4(),
      name: "Sticker Pack",
      price: 5.99,
      quantity_available: 10
    };

    const updatedCart = addToCart(cart, product);

    expect(updatedCart.length).toBe(1);
    expect(updatedCart[0].name).toBe("Sticker Pack");
    expect(updatedCart[0].quantity).toBe(1);
  });

  test("increments quantity when adding the same product again", () => {
    const product = {
      id: uuidv4(),
      name: "Sticker Pack",
      price: 5.99,
      quantity_available: 10
    };

    const cart = [{ ...product, quantity: 1 }];
    const updatedCart = addToCart(cart, product);

    expect(updatedCart.length).toBe(1);
    expect(updatedCart[0].quantity).toBe(2);
  });

  test("adds multiple different products", () => {
    const product1 = { id: uuidv4(), name: "Sticker A", price: 4.99 };
    const product2 = { id: uuidv4(), name: "Sticker B", price: 3.99 };

    const cart = addToCart([], product1);
    const updatedCart = addToCart(cart, product2);

    expect(updatedCart.length).toBe(2);
    expect(updatedCart.find(p => p.name === "Sticker A")).toBeTruthy();
    expect(updatedCart.find(p => p.name === "Sticker B")).toBeTruthy();
  });
});
