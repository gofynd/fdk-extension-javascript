export = ExtensionController;
declare class ExtensionController {
    install(req: any, res: any, next: any): Promise<void>;
    auth(req: any, res: any, next: any): Promise<void>;
    unInstall(req: any, res: any, next: any): Promise<void>;
    admInstall(req: any, res: any, next: any): Promise<void>;
    admAuth(req: any, res: any, next: any): Promise<void>;
}
