const { ModalSubmitInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'update-description-modal',
    type: 'modal',
    /**
     * @param {DiscordBot} client 
     * @param {ModalSubmitInteraction} interaction 
     */
    run: async (client, interaction) => {
        const newDescription = interaction.fields.getTextInputValue('description');
        
        const channel = interaction.channel; // Current case channel

        // Debugging: Log the channel type (numeric value)
        console.log(`Channel Type (numeric): ${channel.type}`);

        // Check if the channel is a GUILD_TEXT (type 0)
        if (channel.type !== 0) {
            return interaction.reply({
                content: 'This channel cannot have its description updated. Only text channels can be modified.',
                ephemeral: true,
            });
        }

        try {
            // Ensure the channel is fetched fully before updating
            await channel.fetch();

            // Update the topic (description) of the text channel
            await channel.setTopic(newDescription); // Correct method for updating the channel's topic
            await interaction.reply({
                content: 'De beschrijving is succesvol gewijzigd.',
                flags: 64 // Using flags for ephemeral responses (deprecated "ephemeral" replaced by "flags")
            });
        } catch (error) {
            console.error('Error updating description:', error);
            await interaction.reply({
                content: 'An error occurred while updating the description.',
                flags: 64 // Again using flags for ephemeral responses
            });
        }
    }
}).toJSON();
