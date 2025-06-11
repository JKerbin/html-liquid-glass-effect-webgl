# Liquid Glass WebGL Demo

**A WebGL and shader-powered glass effect UI, inspired by Apple's WWDC 2025 design.**

---

## Overview

This project showcases a glass-like UI component with real-time refraction, reflection, and frosted glass effects using WebGL and custom shaders.

---

## Features

- **Real-time Normal Calculation:**  
  UI component normals are calculated in real time, allowing you to dynamically adjust the shape and refraction parameters.
- **Live Refraction:**  
  The background is refracted through the glass UI, producing the illusion of depth and light bending.
- **Edge Reflection:**  
  The glass border features realistic highlight effects.
- **Frosted Glass:**  
  A blur layer simulates the appearance of frosted or matte glass.

---

## Optimization Notes

Currently, normal calculations are performed on the fly using JavaScript and GPU shaders to help users learn and explore normal generation techniques. In a production environment, if your component shapes are fixed, you can precompute normal maps and use them with SVG filters. This eliminates the need for WebGL and JavaScript, just CSS.

---

## Screenshots

*Insert screenshots here.*

---

## Live Demo

[View the live demo](https://your-demo-link-here)

---

## Credits

Apple WWDC 2025 Liquid Glass UI.

