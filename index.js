import express from 'express'
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toLowerCase, z } from "zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";


const app = express()
const port = 3000
app.use(express.json())

function createMCPServer(){
    const server = new McpServer({
    name: "acme-projects",
    version: "1.0.0",
    },
    {
        instructions:
            "When the user requests a greeting, ask for their name " +
            "and age if either is missing. Use details already provided " +
            "in the conversation. Once both are known, call greeting."+
            'ask for gender then call check_favorite_sport tool to determine their favorite sports '
    }
);

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
                    if the user says Hi or hello or any greeting, ask about their name and age and call greeting tool which take the name and age as input
                    and greets using the name of the user,
                    Then ask about their gender and call check_favorite_sport tool to determine their favorite sport                           
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
        // this is the structure of the input value    
            inputSchema:{
                "name": z.string(),
                "age": z.number()
            },
        // this is the structure of the actual value
            outputSchema:{
                "name": z.string(),
                "age": z.number()
            },
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                openWorldHint: false
            },

            // specify the UI for the tool output
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
        async({name,age})=>{
            return {
                content:[{
                    type:"text",
                    text:`Hello ${name} your age is ${age}`
                }],
                // this defines the actual value
                structuredContent: {
                "name": name,
                "age": age
            }
            }
        }
    )

    server.registerResource(
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
                                         <style > 
                                #greeting {
                                    font-size: 24px;
                                    font-weight: bold;
                                    color: #f10d0d;
                                    text-align: center;
                                    margin-top: 20px;
                     }
                            </style>
                            </head>
                   

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

                                    const element = document.getElementById("greeting");

                                    if (element) {
                                        element.textContent =
                                            "Hello " + output.name +
                                            ", your age is " + output.age +
                                            " (" + checkAge(output.age) + ")";
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


server.registerTool(
    'check_favorite_sport',
    {
description:
    "Returns predefined sports suggestions based on gender. " +
    "Call this tool when the user provides their gender. " +
    "If gender is missing, ask for it.",
           inputSchema:{
            gender: z.string()
        },
        outputSchema:{
             sports: z.array(z.string())
        }
        ,
        annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                openWorldHint: false
            },

            // specify the UI for the tool output
            _meta: {
                ui: {
                resourceUri:
                    "ui://widget/favsport"
                },

                "openai/outputTemplate":
                "ui://widget/favsport",
                "openai/widgetAccessible":
                true,
            }
    },
    async ({gender})=>{
        let sports =[]

        if(gender.toLocaleLowerCase() === 'male'){
            sports.push('football')
            sports.push('soccer')
            sports.push('basketball')

        }else{
            sports.push('pilates')
            sports.push('tennis')

        }
        return{
        structuredContent:{
         'sports':sports,
        }
    }
    }
)
server.registerResource(
    'favsport',
    'ui://widget/favsport',
    {},
    async ()=>({
        contents: [
            {
                    uri: "ui://widget/favsport",
                    mimeType: "text/html;profile=mcp-app",
                    text:`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Document</title>
                    </head>
                    <body>
                        <div id="favsport"></div>
                    </body>
                    <script>
                        function render(){
                            const output = window.openai?.toolOutput
                            const favsport = document.getElementById('favsport')
                            const sports = output.sports

                            for(const sport of sports){
                                var h1 = document.createElement('h1')
                                h1.textContent(sport)
                                favsport.appendChild(h1)
                            }

                        }
                        render()

                    </script>
                    </html>
                    `
            }
        ]
    })

)

        return server;

}



app.post("/mcp", async (req, res) => {
  try {
    console.log("Incoming MCP request body:");
    console.log("request url is: " + req.baseUrl);
    console.log("the request body is: "+JSON.stringify(req.body, null, 2));

    const server = await createMCPServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP error:", err);

    if (!res.headersSent) {
      res.status(500).json({
        error: "MCP error",
        message: err.message
      });
    }
  }
});

app.listen(port, ()=>{
    console.log("server running on port: ", port)
})