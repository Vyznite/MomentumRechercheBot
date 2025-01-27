const { success } = require("../../utils/Console");
const Event = require("../../structure/Event");
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { Levisconfig } = require("../../config");

module.exports = new Event({
    event: "guildMemberUpdate",
    once: false,
    run: async (oldMember, newMember) => {
        
        module.exports = new Event({
    event: "guildMemberUpdate",
    once: false,
    run: async (oldMember, newMember) => {
        
        if (!newMember.roles.cache.some(role => role.id === Levisconfig.RoleIds.REmember)) {
            console.log(`De rol 'REmember' is toegevoegd aan ${newMember.user.tag}`);

            const roleIdToCheck = Levisconfig.RoleIds.REmember; // Vervang door de ID van de specifieke rol
            const filePath = path.resolve("./src/database.json");
    
            try {
                // Lees de huidige database
                const data = fs.readFileSync(filePath, "utf-8");
                const database = JSON.parse(data);
    
                // Controleer of gebruiker al in de database staat
                const userExists = database.rechercheurs.some(user => user.discordID === newMember.id);
                if (!userExists) {
                    database.rechercheurs.push({
                        naam: newMember.user.tag,
                        discordID: newMember.id,
                        casussen: []
                    });
                    fs.writeFileSync(filePath, JSON.stringify(database, null, 2), "utf-8");
                    success(`✅ Gebruiker ${newMember.user.tag} toegevoegd aan database.`);
                } else {
                    success(`⚠️ Gebruiker ${newMember.user.tag} staat al in de database.`);
                }
            } catch (err) {
                console.error("❌ Fout bij het bijwerken van database.json:", err);
            }
            updateEmbed(newMember.client);
        }
    }
}).toJSON();
    }
}).toJSON();

// Functie om de embed bij te werken
async function updateEmbed(client) {
    const filePath = path.resolve("./src/database.json");

    try {
        const data = fs.readFileSync(filePath, "utf-8");
        const database = JSON.parse(data);
        const channel = client.channels.cache.get(Levisconfig.channelIDs.caseLog);

        if (!channel) {
            console.error("❌ Kanaal niet gevonden.");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("📄 Actieve Casussen")
            .setColor(0x00ff00)
            .setFooter({ text: "Recherche", iconURL: client.user.displayAvatarURL() });

        database.rechercheurs.forEach(rechercheur => {
            let casussenBeschrijving = "";
            rechercheur.casussen.forEach(casus => {
                casussenBeschrijving += `<#${casus.casusID}> \n    **Status:** ${casus.status}\n\n`;
            });

            embed.addFields({
                name: `👤 ${rechercheur.naam}`,
                value: casussenBeschrijving || "Geen casussen gevonden.",
                inline: false
            });
        });

        // Zoek het laatste bericht in het kanaal en update de embed
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(msg => msg.author.id === client.user.id);

        if (botMessage) {
            botMessage.edit({ embeds: [embed] });
            success("✅ Embed succesvol geüpdatet.");
        } else {
            channel.send({ embeds: [embed] }).then(() => success("✅ Nieuwe embed verzonden."));
        }

    } catch (err) {
        console.error("❌ Fout bij updaten van embed:", err);
    }
}
