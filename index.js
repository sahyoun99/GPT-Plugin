import express from 'express'
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";


const app = express()
const port = 3000
app.use(express.json())

function createMCPServer(){
    const server = new McpServer({
    name: "acme-projects",
    version: "1.0.0",
    });

    // base prompt for the model
    server.registerPrompt(
        'assistant',
        {
            title: 'assistant',
            description: ""


        }, 
        async ()=>({
            messages: [
        {
          role: "system",
          content: {
            type: "text",
            text: `
                    if the user says Hi or hello or any greeting, ask about their name and cool greeting tool which take the name 
                    and greets using the name of the user                            
                  `
          }
        }
      ]
        })
    )

    server.registerTool(
        'greeting',
        {
            title:"tool-title",
            description:"A tool to ask the user about his name and age then greets the user",
            inputSchema:{
                "name": z.string()
                
            },
            outputSchema:{
                "name": z.string(),
                "gender": z.string()
            },
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                openWorldHint: false
            },
            _meta: {
                ui: {
                resourceUri:
                    "ui://widget/greeting"
                },

                "openai/outputTemplate":
                "ui://widget/greeting",
                "openai/widgetAccessible":
                true,
            }
        }, 
        async(name,gender)=>{
            return {
                content:[{
                    type:"text",
                    text:`Hello ${name} your gender is ${gender}`
                }],
                structuredContent: {
                name,
                gender
            }
            }
        }
    )

    server.registerPrompt(
        'greeting-widget',
        "ui://widget/greeting",
        {},
        async ()=>({
            contents: [
                {
                    uri: "ui://widget/greeting",
                    mimeType: "text/html;profile=mcp-app",
                    text: `
                        <html lang = 'en' >
                            <head>
                                <meta charset="UTF-8" />
                                <meta
                                    name="viewport"
                                    content="width=device-width,initial-scale=1,viewport-fit=cover"
                                />
                                <title>Greeting</title>
                            <head/>
                            <body>
                                <h1 id = "greeting"></h1>
                            </body>
                            <script>

                                function checkAge(age) {
                                    if (age < 13) {
                                        return "child";
                                    } else if (age >= 13 && age < 20) {
                                        return "teen";
                                    } else {
                                        return "adult";
                                    }
                                }

                                function render(output) {
                                    if (!output) return;
                                    const ageCategory = checkAge(output.age);
                                    const greetingElement = document.getElementById("greeting-" + ageCategory);
                                    if (greetingElement) {
                                        greetingElement.textContent = "Hello " + output.name;
                                    }
                                }

                                window.addEventListener("openai:set_globals", (event) => {
                                    const output = event.detail?.globals?.toolOutput;
                                    if (output) render(output);
                                });

                              render(window.openai?.toolOutput);

                            </script>

                        </html>
                    `
                    
                }
            ]
        })
    )

}


app.get('/mcp',async (req,res)=>{
    const server = createMCPServer()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body)
})

app.listen(port, ()=>{
    console.log("server running on port: ", port)
})