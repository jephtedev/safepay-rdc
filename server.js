const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Autorise ton Dashboard et ton App Mobile à communiquer avec l'API
app.use(cors());
// Permet à l'API de lire les données envoyées au format JSON
app.use(express.json());

// Port dynamique pour s'adapter automatiquement à l'hébergement Render
const PORT = process.env.PORT || 5000;

// --- BASE DE DONNÉES TEMPORAIRE (Simulation) ---
// Contient la transaction exemple de ta maquette (#CMD1258)
let transactions = [
    {
        id: "TRX1258",
        numeroCommande: "CMD1258",
        client: "Jean",
        telephoneClient: "+243812345678",
        adresseLivraison: "Avenue de la Paix, Gombe, Kinshasa, RDC",
        vendeur: "TechStore",
        produit: "Casque Bluetooth",
        montant: 120,
        devise: "USD",
        modePaiement: "M-Pesa", // M-Pesa, Airtel Money, Orange Money, etc.
        statut: "En attente",    // En attente, Validé, En litige
        otpValidation: "5821"   // Le code secret affiché sur la maquette du vendeur
    }
];

// --- LES ROUTES DE L'API (BACKEND) ---

// 1. Tester si l'API fonctionne (Route de base pour Render)
app.get('/', (req, res) => {
    res.send('🔒 Serveur SafePay RDC actif et hautement sécurisé.');
});

// 2. Récupérer toutes les transactions (Utile pour ton Dashboard Administrateur)
app.get('/api/transactions', (req, res) => {
    res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions
    });
});

// 3. Étape d'Achat : Bloquer l'argent dans le système (Séquestre)
app.post('/api/transactions/bloquer', (req, res) => {
    const { client, telephoneClient, adresseLivraison, vendeur, produit, montant, modePaiement } = req.body;

    // Vérification que toutes les informations indispensables sont présentes
    if (!client || !vendeur || !produit || !montant) {
        return res.status(400).json({ 
            success: false, 
            message: "Erreur : Veuillez fournir le client, le vendeur, le produit et le montant." 
        });
    }

    // Génération automatique des détails de la transaction
    const nouvelleTransaction = {
        id: `TRX${Math.floor(1000 + Math.random() * 9000)}`, // Génère un ID unique comme TRX4729
        numeroCommande: `CMD${Math.floor(1000 + Math.random() * 9000)}`,
        client,
        telephoneClient: telephoneClient || "+243000000000",
        adresseLivraison: adresseLivraison || "Kinshasa, RDC",
        vendeur,
        produit,
        montant,
        devise: "USD",
        modePaiement: modePaiement || "M-Pesa",
        statut: "En attente",
        otpValidation: Math.floor(1000 + Math.random() * 9000).toString(), // Crée l'OTP à 4 chiffres pour la livraison
        createdAt: new Date()
    };

    transactions.push(nouvelleTransaction);

    res.status(201).json({
        success: true,
        message: "L'argent a été retiré du client et bloqué en toute sécurité par SafePay RDC.",
        data: nouvelleTransaction
    });
});

// 4. Étape de Validation : Le client confirme la livraison avec son code OTP ou QR Code
app.post('/api/transactions/debloquer', (req, res) => {
    const { transactionId, otp } = req.body;

    // Rechercher la transaction correspondante
    const tx = transactions.find(t => t.id === transactionId);

    if (!tx) {
        return res.status(404).json({ success: false, message: "Transaction introuvable." });
    }

    // Vérifier si l'argent n'a pas déjà été libéré
    if (tx.statut !== "En attente") {
        return res.status(400).json({ 
            success: false, 
            message: `Impossible de modifier. Cette transaction est déjà : ${tx.statut}` 
        });
    }

    // Vérification de la clé de sécurité (OTP de livraison)
    if (tx.otpValidation !== otp) {
        return res.status(401).json({ 
            success: false, 
            message: "Code OTP incorrect. Sécurité SafePay : Fonds toujours bloqués." 
        });
    }

    // Si le code est bon, on change le statut et on libère l'argent pour le vendeur
    tx.statut = "Validé";
    tx.libereAt = new Date();

    res.status(200).json({
        success: true,
        message: `Félicitations ! Livraison validée. Le montant de ${tx.montant}$ a été versé sur le compte du vendeur ${tx.vendeur}.`,
        data: tx
    });
});

// 5. Gestion des litiges (Si le client ne reçoit pas son produit)
app.post('/api/transactions/litige', (req, res) => {
    const { transactionId } = req.body;
    const tx = transactions.find(t => t.id === transactionId);

    if (!tx) return res.status(404).json({ success: false, message: "Transaction introuvable." });

    tx.statut = "En litige";
    
    res.status(200).json({
        success: true,
        message: "La transaction a été suspendue. L'équipe SafePay va analyser les preuves de livraison.",
        data: tx
    });
});

// Lancement de l'écoute du serveur
app.listen(PORT, () => {
    console.log(`[SafePay RDC] Serveur démarré avec succès sur le port ${PORT}`);
});
  
