import { load } from "js-yaml";
import examplesYaml from "../data/examples.yaml?raw";

interface Example {
    name: string;
    website?: string;
    hn?: string;
    url: string;
    notes?: string;
}

export const examples = load(examplesYaml) as Example[];
