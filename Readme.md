# **Aerophilia Backend**

## **📋 Overview**

This repository contains the backend API for a robust Event Management Platform. It is built with a modern tech stack including Node.js, Express, and TypeScript. The platform is designed to handle user authentication, event and team management, event registrations, and secure payment processing through Razorpay. It uses Google Firestore as its primary database.

This API serves as the backbone for a web or mobile application, providing all the necessary endpoints to manage a complete event lifecycle.

## **✨ Key Features**

* **User Authentication**: Secure user registration and login using Firebase Authentication and JWT verification.  
* **Role-Based Access Control (RBAC)**: Middleware to protect routes and differentiate permissions between users (e.g., admin vs. participant).  
* **Complete Event Management**: Endpoints for creating, retrieving, and managing events.  
* **Team System**: Functionality for users to create, join, and manage teams for collaborative events.  
* **Registration Flow**: Logic to handle user and team registrations for specific events, including validation for team sizes.  
* **Payment Integration**: Seamlessly integrated with **Razorpay** for handling event registration fees.  
* **Automated Email Notifications**: Utility to send emails for key actions like successful registration, payment confirmation, and team requests.  
* **Scalable & Typed Codebase**: Written in TypeScript for better maintainability, scalability, and fewer runtime errors.  
* **Structured Error Handling**: Centralized error handling and async wrappers for cleaner controller logic.

## **🛠️ Tech Stack**

* **Backend**: Node.js, Express.js  
* **Language**: TypeScript  
* **Database**: Google Firestore  
* **Authentication**: Firebase Authentication  
* **Payment Gateway**: Razorpay  
* **Development**: ts-node-dev for live reloading

## **📂 Project Structure**

The project is organized into a modular structure to ensure separation of concerns and maintainability.

├── .gitignore  
├── controllers  
    ├── Allevent  
    │   ├── getAllEvents.ts  
    │   └── getEventId.ts  
    ├── events.ts  
    ├── razorpayController.ts  
    ├── teams  
    │   ├── getTeam.ts  
    │   └── patchTeam.ts  
    └── user.ts  
├── createCollections.js  
├── firebase.ts  
├── initFirestore.ts  
├── middlewares  
    ├── firebaseVerifyToken.ts  
    ├── role.ts  
    ├── roleMiddleware.ts  
    ├── teamAuth.ts  
    ├── teamSizemiddleware.ts  
    ├── userLogin.ts  
    └── validation.ts  
├── package-lock.json  
├── package.json  
├── razorpay.config.ts  
├── routes  
    ├── events.ts  
    ├── getEvent.ts  
    ├── razorpayRoutes.ts  
    ├── registrations.ts  
    ├── requests.ts  
    ├── teams.ts  
    └── user.ts  
├── server.ts  
├── tsconfig.json  
├── types  
    ├── eventSchema.ts  
    ├── firebasetypes.ts  
    ├── razorpaytypes.ts  
    ├── teamSchema.ts  
    └── userSchema.ts  
└── utils  
    ├── asyncHandler.ts  
    ├── errorHandler.ts  
    ├── expressError.ts  
    ├── initializeFirestore.ts  
    ├── razorpayUtils.ts  
    ├── sendEmail.ts  
    └── sendEmails  
        ├── eventRegistration.ts  
        ├── paymentConfirmation.ts  
        └── teamRequest.ts

## **🚀 Getting Started**

Follow these instructions to set up and run the project on your local machine.

### **Prerequisites**

* [Node.js](https://nodejs.org/) (v18.x or higher recommended)  
* npm or yarn package manager  
* A [Firebase Project](https://console.firebase.google.com/) with **Authentication** and **Firestore** enabled.  
* A [Razorpay Account](https://razorpay.com/) to get API keys.

### **1\. Clone the Repository**

git clone \<your-repository-url\>  
cd \<project-directory\>

### **2\. Install Dependencies**

npm install

### **3\. Set Up Environment Variables**

Create a .env file in the root directory by making a copy of the example file.

cp .env

Now, open the .env file and populate it with your credentials:

\# Server configuration  
PORT=8000

\# Firebase Service Account Key  
\# Get this from Project settings \> Service accounts in your Firebase console.  
\# It's a JSON object; you can either paste the JSON directly or base64 encode it.  
FIREBASE\_SERVICE\_ACCOUNT\_KEY\_JSON='{...}'

\# Razorpay API Credentials  
RAZORPAY\_KEY\_ID=your\_razorpay\_key\_id  
RAZORPAY\_KEY\_SECRET=your\_razorpay\_key\_secret

\# Email Service Credentials (for Nodemailer)  
EMAIL\_HOST=your\_smtp\_host  
EMAIL\_PORT=587  
EMAIL\_USER=your\_email\_address  
EMAIL\_PASS=your\_email\_password

### **4\. Run the Development Server**

The project uses ts-node-dev to automatically restart the server on file changes.

npm run dev

The API server should now be running on the port specified in your .env file (e.g., http://localhost:8000).

## **🌐 API Endpoints Overview**

The API routes are prefixed with /api. Here are the main resources:

* **POST /api/user/**: User registration and login endpoints.  
* **GET /api/events/**: Routes to fetch all events or a specific event by ID.  
* **POST /api/teams/**: Endpoints for creating and managing teams.  
* **POST /api/registrations/**: Handles event registrations for users and teams.  
* **POST /api/payment/**: Routes for creating Razorpay orders and verifying payments.

For detailed information on each endpoint, please refer to the route definitions in the /routes directory.

## **🤝 Contributing**

Contributions are welcome\! If you'd like to improve the project, please feel free to fork the repository, create a new branch, and submit a pull request.