const { ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require('../../structure/ApplicationCommand');
const config = require("../../config");

module.exports = new ApplicationCommand({
    __type__: 1, // Application Command
    command: {
        name: 'close-case',
        description: 'Close the current case by moving it to the CLOSED CASES category and updating the case log.',
        type: 1, // Slash command type
    },
    options: {
        botDevelopers: true,
        cooldown: 5000, // 5-second cooldown
    },
    /**
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            // Acknowledge the interaction
            console.log("Interaction acknowledged");
            await interaction.deferReply();

            // Get the current channel (case channel)
            const caseChannel = interaction.channel;
            console.log(`Casus kanaal naam: ${caseChannel.name}`);

            // Ensure the channel starts with '『📒』'
            if (!caseChannel.name.startsWith("『📒』")) {
                console.log("Kanaal is niet geldig voor sluiten");
                return interaction.followUp({
                    content: 'Deze opdracht moet uitgevoerd worden in een geldige casus kanaal.',
                    ephemeral: true,
                });
            }

            // Find the "CLOSED CASES" category
            const closedCategory = interaction.guild.channels.cache.find(
                (channel) => channel.id === config.Levisconfig.catogoryIDs.closedCategory && channel.type === 4
            );


            if (!closedCategory) {
                console.log("Afgeronde zaken categorie niet gevonden");
                return interaction.followUp({
                    content: 'De "✅ Afgeronde zaken" categorie was niet gevonden. Maak deze eerst.',
                    ephemeral: true,
                });
            }
            console.log(`Afgeronde zaken categorie gevonden: ${closedCategory.name}`);

            // Move the channel to the CLOSED CASES category and rename it
            console.log("Bezig met verplaatsen naar de '✅ Afgeronde zaken' categorie...");
            await caseChannel.setParent(closedCategory.id, { lockPermissions: false });
            await caseChannel.setName(`『📒✅』${caseChannel.name.replace('『📒』', '')}`);
            console.log(`Kanaal verplaatst en hernoemd naar: ${caseChannel.name}`);

            // Update the case-log embed
            const logChannel = interaction.guild.channels.cache.find(
                (channel) => channel.id === config.Levisconfig.channelIDs.caseLog && channel.type === 0
            );


            if (!logChannel) {
                console.log("Log kanaal niet gevonden");
                return interaction.followUp({
                    content: 'Log kanaal "『📙』ongoing-cases" niet gevonden. Maak deze eerst.',
                    ephemeral: true,
                });
            }
            console.log(`Log channel found: ${logChannel.name}`);

            // Fetch the case-log embed
            const fetchMessages = await logChannel.messages.fetch({ limit: 10 });
            const embedMessage = fetchMessages.find((msg) => msg.author.id === client.user.id && msg.embeds.length > 0);
            if (!embedMessage) {
                console.log("No embed found in log channel");
                return interaction.followUp({
                    content: 'No active case log found.',
                    ephemeral: true,
                });
            }
            console.log("Embed found in log channel");

            // Get the current case title
            const caseTitle = caseChannel.name.replace('『📒』', '').replace('『📒✅』', '');
            console.log(`Closing case: ${caseTitle}`);

            // Format the case channel ID for comparison
            const caseChannelIDFormatted = `<#${caseChannel.id}>`;
            console.log(`Formatted case channel ID: ${caseChannelIDFormatted}`);

            // Get the embed and log its fields for debugging
            const embed = embedMessage.embeds[0];
            console.log("Embed fields:", embed.fields);

            if (!embed.fields || embed.fields.length === 0) {
                console.log("No fields found in the embed. Skipping update.");
                return;
            }
            
            // Filter the embed fields and remove the case channel ID only (if present)
            if (!embed.fields || embed.fields.length === 0) {
                console.log("No fields found in the embed. Skipping update.");
                return;
            }
            
            // Map through the embed fields to replace the channel ID with "done"
            const updatedFields = embed.fields.map(field => {
                console.log(`Processing field: ${field.value}`);
            
                // Split the field value by newline
                const channelIds = field.value.split('\n');
            
                // Replace the specific channel ID with "done"
                const updatedChannelIds = channelIds.map(id =>
                    id === caseChannelIDFormatted ? "done" : id
                );
            
                // Update the field value
                return { ...field, value: updatedChannelIds.join('\n') };
            });
            
            // Debugging: Log the updated fields
            console.log("Updated fields:", updatedFields);
            
            // Create the updated embed
            const updatedEmbed = EmbedBuilder.from(embed).setFields(updatedFields);
            
            // Debugging: Log the updated embed object
            console.log("Updated embed:", updatedEmbed.toJSON());
            
            try {
                console.log("Attempting to edit the message...");
                await embedMessage.edit({ embeds: [updatedEmbed] });
                console.log("Embed updated successfully.");
            } catch (error) {
                console.error("Failed to update the embed:", error);
            }
            

            // Notify the user of the case closure
            console.log(`Notifying user about case closure: ${caseTitle}`);
            await interaction.followUp({
                content: `Case **${caseTitle}** has been successfully closed and moved to the "CLOSED CASES" category.`,
                ephemeral: true,
            });

        } catch (err) {
            console.error('Error executing close-kees command:', err);
            interaction.followUp({
                content: 'An error occurred while closing the case.',
                ephemeral: true,
            });
        }
    },
}).toJSON();
