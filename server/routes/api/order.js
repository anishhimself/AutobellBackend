const express = require("express");
const router = express.Router();
const Mongoose = require("mongoose");

// Bring in Models & Helpers
const Address = require("../../models/address");
const Order = require("../../models/order");
const Cart = require("../../models/cart");
const Product = require("../../models/product");
const auth = require("../../middleware/auth");
const role = require("../../middleware/role");
const mailgun = require("../../services/mailgun");
const store = require("../../helpers/store");

router.post("/add", auth, async (req, res) => {
  try {
    const cart = req.body.cartId;
    const user = req.user._id;
    const phoneNumber = req.body.phoneNumber;
    const payment = req.body.payment;
    const total = req.body.total;

    const address = await Address.findOne({user: user._id, isDefault: true});

    const order = new Order({
    
      cart,
      user,
      phoneNumber,
      payment,
      total,
    });

if(address){
  order.address = {address: address.address, city: address.city, state: address.state};
}else{
  //if customer doesnot have any address 
  order.address = {address: '', city: '', state: ''};
}
    const orderDoc = await order.save();

    const cartDoc = await Cart.findById(orderDoc.cart._id).populate({
      path: "products.product",
      populate: {
        path: "brand",
      },
    });

   
    

    const newOrder = {
      _id: orderDoc._id,
      created: orderDoc.created,
      address: orderDoc.address,
      phoneNumber: orderDoc.user.phoneNumber,
      payment: orderDoc.payment,
      total: orderDoc.total,
      products: cartDoc.products,
    };
    await mailgun.sendEmail(order.user.email, "order-confirmation", newOrder);

    res.status(200).json({
      success: true,
      message: `Your order has been placed successfully!`,
      order: { _id: orderDoc._id },
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      
      error: "Your request could not be processed. Please try again.",
    });
  }
});

// search orders api
router.get("/search", auth, async (req, res) => {
  try {
    const { search } = req.query;

    if (!Mongoose.Types.ObjectId.isValid(search)) {
      return res.status(200).json({
        orders: [],
      });
    }

    let ordersDoc = null;

    if (req.user.role === role.ROLES.Admin) {
      ordersDoc = await Order.find({
        _id: Mongoose.Types.ObjectId(search),
      }).populate({
        path: "cart",
        populate: {
          path: "products.product",
          populate: {
            path: "brand",
          },
        },
      });
    } else {
      const user = req.user._id;
      ordersDoc = await Order.find({
        _id: Mongoose.Types.ObjectId(search),
        user,
      }).populate({
        path: "cart",
        populate: {
          path: "products.product",
          populate: {
            path: "brand",
          },
        },
      });
    }

    ordersDoc = ordersDoc.filter((order) => order.cart);

    if (ordersDoc.length > 0) {
      const newOrders = ordersDoc.map((o) => {
        return {
          _id: o._id,
          address: o.address,
          phoneNumber: o.phoneNumber,
          payment: o.payment,
          total: parseFloat(Number(o.total.toFixed(2))),
          created: o.created,
          products: o.cart?.products,
        };
      });

      let orders = newOrders.map((o) => store.caculateTaxAmount(o));
      orders.sort((a, b) => b.created - a.created);
      res.status(200).json({
        orders,
      });
    } else {
      res.status(200).json({
        orders: [],
      });
    }
  } catch (error) {
    res.status(400).json({
      error: "Your request could not be processed. Please try again.",
    });
  }
});

// fetch orders api
router.get("/", auth, async (req, res) => {
  try {
    let orderDoc = null;
    const user = req.user._id;
    if(req.user.role === role.ROLES.Admin) {

       ordersDoc = await Order.find().populate({
        path: "cart",
        populate: {
          path: "products.product",
          populate: {
            path: "brand",
          },
        },
      });

    }
    else{

    

     ordersDoc = await Order.find({ user }).populate({
      path: "cart",
      populate: {
        path: "products.product",
        populate: {
          path: "brand",
        },
      },
    });
  }
    ordersDoc = ordersDoc.filter((order) => order.cart);
   
    if (ordersDoc.length > 0) {
      const newOrders = ordersDoc.map((o) => {
        return {
          _id: o._id,
          total: parseFloat(Number(o.total.toFixed(2))),
          created: o.created,
          products: o.cart?.products,
        };
      });

      let orders = newOrders.map((o) => store.caculateTaxAmount(o));
      orders.sort((a, b) => b.created - a.created);
      res.status(200).json({
        orders,
      });
    } else {
      res.status(200).json({
        orders: [],
      });
    }
  } catch (error) {
    res.status(400).json({
      error: "Your request could not be processed. Please try again.",
    });
  }
});


// fetch order api
router.get("/:orderId", auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    let orderDoc = null;

    if (req.user.role === role.ROLES.Admin) {
      orderDoc = await Order.findOne({ _id: orderId }).populate({
        path: "cart",
        populate: {
          path: "products.product",
          populate: {
            path: "brand",
          },
        },
      }).populate("user", "-password");
    } else {
      const user = req.user._id;
      orderDoc = await Order.findOne({ _id: orderId, user }).populate({
        path: "cart",
        populate: {
          path: "products.product",
          populate: {
            path: "brand",
          },
        },
      }).populate("user", "-password");
    }

    if (!orderDoc || !orderDoc.cart) {
      return res.status(404).json({
        message: `Cannot find order with the id: ${orderId}.`,
      });
    }

    
    let order = {
      _id: orderDoc._id,
      name: orderDoc.user.firstName + ' '+ orderDoc.user.lastName,
      address: orderDoc.address,
      phoneNumber: orderDoc.user.phoneNumber,
      payment: orderDoc.payment,
      total: orderDoc.total,
      created: orderDoc.created,
      products: orderDoc?.cart?.products,
      cartId: orderDoc.cart._id,
    };

    order = store.caculateTaxAmount(order);


    res.status(200).json({
      order,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: "Your request could not be processed. Please try again.",
    });
  }
});

router.delete("/cancel/:orderId", auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId });
    const foundCart = await Cart.findOne({ _id: order.cart });

    increaseQuantity(foundCart.products);

    await Order.deleteOne({ _id: orderId });
    await Cart.deleteOne({ _id: order.cart });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      error: "Your request could not be processed. Please try again.",
    });
  }
});

router.put("/status/item/:itemId", auth, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const orderId = req.body.orderId;
    const cartId = req.body.cartId;
    const status = req.body.status || "Cancelled";

    const foundCart = await Cart.findOne({ "products._id": itemId });
    const foundCartProduct = foundCart.products.find((p) => p._id == itemId);

    await Cart.updateOne(
      { "products._id": itemId },
      {
        "products.$.status": status,
      }
    );

    if (status === "Cancelled") {
      await Product.updateOne(
        { _id: foundCartProduct.product },
        { $inc: { quantity: foundCartProduct.quantity } }
      );

      const cart = await Cart.findOne({ _id: cartId });
      const items = cart.products.filter((item) => item.status === "Cancelled");

      // All items are cancelled => Cancel order
      if (cart.products.length === items.length) {
        await Order.deleteOne({ _id: orderId });
        await Cart.deleteOne({ _id: cartId });

        return res.status(200).json({
          success: true,
          orderCancelled: true,
          message: `${
            req.user.role === role.ROLES.Admin ? "Order" : "Your order"
          } has been cancelled successfully`,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Item has been cancelled successfully!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item status has been updated successfully!",
    });
  } catch (error) {
    res.status(400).json({
      error: "Your request could not be processed. Please try again.",
    });
  }
});

const increaseQuantity = (products) => {
  let bulkOptions = products.map((item) => {
    return {
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: item.quantity } },
      },
    };
  });

  Product.bulkWrite(bulkOptions);
};

module.exports = router;
