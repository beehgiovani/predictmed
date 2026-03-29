import { https } from "firebase-functions";
import { app } from "./_core/index";

// Ponto de entrada para o Firebase Functions.
// Isso permite que o backend do PredictMed rode direto no Firebase.
export const api = https.onRequest(app);
